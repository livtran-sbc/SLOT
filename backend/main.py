from fastapi import FastAPI, Request
from fastapi.responses import JSONResponse
from datetime import datetime
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import List, TypedDict

import os

# this section needs to be before the logger is established so the 'WINDOWS_USERNAME' environment variable
# can be properly set
if 'MTILDA_SERVER' not in os.environ:
    from config.set_creds import set_env_vars
    #print('IN DEV -- SETTING ENVIRONMENT VARIABLES')
    set_env_vars()

# this may be removed after authentication is added
import subprocess
os.environ['WINDOWS_USERNAME'] = "WIN\\{}".format(subprocess.run('whoami', capture_output=True).stdout.strip().decode().split('\\')[1])

from scripts.logger import get_logger
lgr = get_logger()

from scripts.db_util import dbUtility

import json
import pandas as pd

app = FastAPI()
db = dbUtility()


app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.exception_handler(Exception)
async def exception_handler(request: Request, e: Exception):
    lgr.warning('Exception occurred due to: {}'.format(str(e)))

    endpoint = request.scope.get("endpoint")

    db.insert_audit_record(
        endpoint.__name__ if endpoint else request.url.path,
        {**request.query_params},
        "error",
        str(e))

    return JSONResponse(status_code=500, content={'detail': str(e)})

#####################################################################################################################################################################
                                                                    ##### UTIL API - VALIDATE MC #####

# check that the micronic codes in the provided file are not already linked to another sample and that it
# is linked to an extraction number
@app.get('/api/validate-micronic-file')
def validate_micronic_file(micronic_codes: str):

    lgr.info("Validating uploaded Micronic Output file...")

    # check if micronic code exists (i.e. has it been linked? or was the code scanned in incomplete?) and get extraction number
    # returns a list of objects with extraction number and associated micronic code if all codes are valid and False
    # returns a list of invalid micronic codes, if any/all codes are invalid and True
    data, validity_check = db.get_extraction_numbers(micronic_codes)

    lgr.info("Finished validating Micronic Output file!")

    return {
        'valid': validity_check,
        'results': data
    }

#####################################################################################################################################################################
                                                                            ##### ASSIGN MC #####
# write requests involving micronic tubes
class MicronicWriteRequests(BaseModel):
    table: str
    rows: List[dict]
    dna_type: str

@app.post('/api/link-micronic-codes')
def link_micronic_codes(request: MicronicWriteRequests):

    lgr.info('***** Link Micronic Codes API call made! *****')

    rows = request.rows
    table = request.table
    sample_type = request.dna_type

    # insert sample type
    # G = Genomic DNA
    # C = Chimerism
    dna_type = 'G' if sample_type == 'Genomic DNA' else 'C'
    lgr.info('DNA type: {}'.format(dna_type))

    lgr.info('Provided Extraction Numbers: {}'.format([i['extraction number'] for i in rows]))
    extraction_numbers = ','.join([i['extraction number'] for i in rows])

    db_extractions, tube_type = db.get_extraction_info(extraction_numbers)

    valid_tab = True
    missing_values = []
    status = "success"

    # check if user is on the right tab based on returned tube type
    # user is on the wrong tab or has mixed samples if:
    # any Nones are present in tube_type and selected tab is Chimerism
    # tube_type does not only consist of None and selected tab is Genomic DNA
    if (any(x is None for x in tube_type) and sample_type == 'Chimerism') or (not all(x is None for x in tube_type) and sample_type == 'Genomic DNA'):
        lgr.warning('User is on the wrong tab -- extraction number tube types do not match the selected sample tab')
        valid_tab = False
        invalid_nums = {}
        existing_links = {}

    if valid_tab:

        invalid_nums, existing_links, all_valid_nums = db.check_extraction_numbers(extraction_numbers, db_extractions)

        valid_rows = [i for i in rows if i['extraction number'] in all_valid_nums]

        error_message = {}

        if invalid_nums:
            error_message['invalid extraction num'] = [i['invalid extraction numbers'] for i in invalid_nums]
        if existing_links:
            error_message['existing links'] = existing_links

        if valid_rows:

            # check if there are missing DNA concentration (+ purity ratio for gDNA values)
            # if any extraction numbers are missing required fields, filter them out of valid rows and do not link them
            missing_values = db.check_req_fields(valid_rows, sample_type)

            if invalid_nums or existing_links:
                status = "partial"

            if not missing_values.empty:
                status = "partial"
                missing_quant_values = missing_values['extraction number'].to_list()
                lgr.warning("Extraction Numbers with Missing Quantification Values: {}".format(missing_quant_values))
                valid_rows = [j for j in valid_rows if j['extraction number'] not in missing_quant_values]
                error_message['missing quantification values'] = missing_quant_values

            # if there are still valid extraction numbers after the three checks, status = success or partial
            # write values to mc_dna_extraction-number table
            if valid_rows:
                # add micronic code + extraction number link to mc_dna_extraction_number table
                values = [(
                          int(row['extraction number']),
                          row['micronic code'],
                           os.environ['WINDOWS_USERNAME'],
                           datetime.now().strftime('%Y-%m-%d %H:%M:%S.%f')[:-3],
                            dna_type
                           ) for row in valid_rows]

                db.insert_records(table, values)
            # if all extraction numbers are invalid after the three checks, status = error
            else:
                status = "error"

            db.insert_audit_record("link_micronic_codes", {**request.model_dump()}, status, error_message=error_message)
        else:
            # all entered extraction numbers have issues - either the extraction number is invalid, or it's already
            # linked
            db.insert_audit_record("link_micronic_codes", {**request.model_dump()}, status='error', error_message=error_message)
    else:
        # invalid tab selected
        db.insert_audit_record("link_micronic_codes", {**request.model_dump()}, status='error', error_message='wrong tab selected')

    lgr.info('***** Link Micronic Codes API call completed! *****')

    return {
        'invalidExtractions': invalid_nums,
        'invalidLinks': existing_links,
        # map as JS array of objects
        'missingVals': missing_values.to_dict(orient='records') if isinstance(missing_values, pd.DataFrame) else [],
        # boolean for if the user is on the correct tab for selected sample type
        'tabCheck': valid_tab
    }

#####################################################################################################################################################################
                                                            ##### ASSIGN FREEZER BOX BARCODE #####
class FBWriteRequests(BaseModel):
    freezer_box_table: str
    entered_barcode: str

@app.post('/api/assign-fb-barcode')
def assign_freezer_barcode(request: FBWriteRequests):

    lgr.info('***** Assign Freezer Barcode API call made! *****')

    barcode = request.entered_barcode
    table = request.freezer_box_table

    lgr.info("Entered barcode: {}".format(barcode))
    lgr.info("Table being updated: {}".format(table))

    lgr.info("Extracting box information...")
    (current_pk, current_box_name, prev_box_barcode, prev_box_name, future_box_name) = db.get_fb_info(table)

    lgr.info("Previous box: {} ".format(prev_box_name))
    lgr.info("Newly assigned box: {}".format(current_box_name))
    lgr.info("Next box: {}".format(future_box_name))

    # update barcode in table
    db.update_fb_barcode(barcode, table, current_box_name)

    # returns '' if not less 24 boxes
    # else returns a string with the freezer name and number of boxes left for the freezer
    last_boxes = db.check_last_boxes(current_box_name, table)

    other_message = None

    if last_boxes != "":
        other_message = ["info", last_boxes]

    db.insert_audit_record("assign_freezer_barcode", {**request.model_dump()}, status='success', other_messages=other_message)

    lgr.info('***** Assign Freezer Barcode API call completed! *****')

    return {
        'boxInfo': {
            'previousBox': (prev_box_name, prev_box_barcode),
            'currentBox': (current_box_name, barcode),
            'futureBox': future_box_name
        },
        'lastBox': last_boxes
    }

#####################################################################################################################################################################
                                                                    ##### ASSIGN LOCATION #####

# both micronic code and freezer box elements are needed to assign freezer location
class FreezerMicronicWriteRequests(BaseModel):
    en_mcodes: List[TypedDict("CodesExNumDict", {"extraction number": int, "micronic code": str, 'location': str})]
    barcode: str
    dna_type: str

@app.post('/api/assign-freezer-location')
def assign_freezer_location(request: FreezerMicronicWriteRequests):

    lgr.info('***** Assign Freezer Location API call made! *****')

    en_mcodes = request.en_mcodes
    barcode = request.barcode
    sample_type = request.dna_type

    table_prefix = 'chi' if sample_type == 'Chimerism' else 'gdna'
    lgr.info('Selected DNA type'.format(sample_type))

    # initialize booleans as True
    # front end will check the following in sequential order:
    # micronic code validity --> return micronic codes error if any are invalid
    # freezer box barcode validity --> return error if fb barcode is not valid
    mc_valid = True
    new_slots = ''

    fb_details, fb_valid = db.check_freezer_barcode(table_prefix, barcode)

    # fb_valid = True --> freezer box barcode scanned in exists
    if fb_valid:

        # occupied slots in existing box
        filled_slots = db.get_occupied_positions(table_prefix, barcode)

        new_slots = [i for i in en_mcodes if i.get('location') not in filled_slots]

        if len(new_slots) != 0:
            lgr.info("Spots to be assigned: {}".format(new_slots))
            micronic_codes = [i['micronic code'] for i in new_slots]
            # check if micronic code has already been assigned to a sample
            check_results, mc_valid = db.check_micronic_code_assigned(table_prefix, micronic_codes)
        else:
            lgr.warning("No new samples detected based on box data in the database")
            mc_valid = False
            check_results = ""

        # mc_valid = True --> micronic codes have not been assigned before and there are slots available - proceed with assigning location
        if mc_valid:
            fb_pk, box = fb_details

            from scripts.data_util import dataUtil

            table_name = '{}_micronic_tubes'.format(table_prefix)

            values = [(
                # FK_FreezerBox
                fb_pk,
                # Location,
                row['location'],
                # MicronicCode
                row['micronic code'],
                # RecordCreatedWhen
                datetime.now().strftime('%Y-%m-%d %H:%M:%S.%f')[:-3],
                # RecordCreatedBy
                os.environ['WINDOWS_USERNAME']
            ) for row in new_slots]

            # write new locations into <>_micronic_tubes
            db.insert_records(table_name, values)

            # overwrite existing location with boxname + location -- will be used to insert into Dna_extractions
            # table and to display in UI
            assignment_array = dataUtil.alter_location(box, new_slots)
            # update location in Dna.extractions -- mTilda DB
            db.update_assigned_location(assignment_array)

            db.insert_audit_record("assign_freezer_location", {**request.model_dump()}, status='success')

            data = assignment_array
        else:
            # no new slots detected or Micronic Code has already been assigned to another box
            data = check_results
            error_message = "No new samples detected" if data == "" else "Duplicate assigned codes detected: {}".format(check_results)
            db.insert_audit_record("assign_freezer_location", {**request.model_dump()}, status='error', error_message=error_message)
    else:
        # freezer box not found
        db.insert_audit_record("assign_freezer_location", {**request.model_dump()}, status='error', error_message='freezer box not found')
        data = []

    # data
    # invalid/unlinked micronic codes if mc_valid = False
    # an array of objects containing extraction numbers, micronic codes, and newly assigned location if number of
    # available slots does not exceed number of provided samples
    # an array with the number of remaining slots, otherwise

    lgr.info('***** Assign Freezer Location API call completed! *****')

    return {
        'mcValid': mc_valid,
        'fbValid': fb_valid,
        'newSlots': len(new_slots),
        'results': data
    }

#####################################################################################################################################################################
                                                                ##### VERIFY TUBE LOCATION#####

@app.get('/api/verify-tube-location')
def verify_tube_location(request: Request, micronic_contents: str, barcode: str, sample_type: str):

    lgr.info('***** Verify Tube Location API call made! *****')

    micronic_contents = json.loads(micronic_contents)
    table_prefix = 'chi' if sample_type == 'Chimerism' else 'gdna'

    lgr.info('Selected DNA type'.format(sample_type))

    fb_details, fb_valid = db.check_freezer_barcode(table_prefix, barcode)
    diff_df = {}

    # if scanned in freezer box is valid, proceed with getting samples in box
    if fb_valid:
        fb_pk = fb_details[0]
        box_contents = db.get_box_contents(fb_pk, table_prefix)

        micronic_file_contents = pd.DataFrame(micronic_contents)

        from scripts.data_util import dataUtil

        lgr.info("Comparing box contents...")

        diff_df = dataUtil.create_diff_df(box_contents, micronic_file_contents, join_on='location', df2_col= 'micronic code')
        diff_df.insert(0, "row number", range(1, len(diff_df) + 1))

        if not diff_df[diff_df["match"] == "FALSE"].empty:
            lgr.info("Mismatches detected! See audit log for more details")
        else:
            lgr.info("No mismatches detected")

        db.insert_audit_record("verify_tube_location", {"micronic_contents": micronic_contents, "table_prefix": table_prefix}, status='success', other_messages=['outputs', diff_df.to_dict(orient="records")])
    else:
        # invalid freezer box barcode
        db.insert_audit_record("verify_tube_location", {"micronic_contents": micronic_contents, "table_prefix": table_prefix}, status='error', error_message='freezer box not found')

    lgr.info('***** Verify Tube Location API call completed! *****')

    return {
        'fbValid': fb_valid,
        'diffDf': diff_df.to_dict(orient='records') if len(diff_df) != 0 else diff_df
    }

#####################################################################################################################################################################
                                                                    ##### SSO #####
class ProcessSSORequests(BaseModel):
    mcFileName: str
    mcContent: str
    ttxFileName: str
    ttxContent: str

@app.post('/api/sso-verification')
def sso_verification(request: ProcessSSORequests):

    import subprocess
    import tempfile
    import re
    from pathlib import Path

    # file content is sent over HTTP as a stream of bytes
    with tempfile.TemporaryDirectory() as tmpdir:

        # create new destination path in temp directory for uploaded files
        mc_path = Path(tmpdir) / request.mcFileName
        ttx_path = Path(tmpdir) / request.ttxFileName

        # create file and write file content on disk
        mc_path.write_text(request.mcContent)
        ttx_path.write_text(request.ttxContent)

        # temporarily modify path to be compatible with wsl..
        # this shouldn't be an issue with a linux server in the future

        wsl_mc_path = re.sub(r'^C:', '/mnt/c', re.sub(r'[\\]', '/', str(mc_path)))
        wsl_ttx_path = re.sub(r'^C:', '/mnt/c', re.sub(r'[\\]', '/', str(ttx_path)))

        try:
            result = subprocess.run(
                        ['wsl', '-d', 'Ubuntu', './autorun.sh', str(wsl_ttx_path), str(wsl_mc_path)],
                        capture_output=True, text=True, check = True)

            # convert barcode_path back to Windows
            barcode_path = 'F:\\' + re.sub(r'/', '\\\\',
                            result.stdout.strip()[7:])

            from datetime import date
            import csv

            barcode_compare_file = "{}/BarcodeResults_{}.csv".format(barcode_path, date.today())

            with open(barcode_compare_file, newline='') as f:
                reader = csv.DictReader(f, fieldnames= ["location", 'micronic code', 'match'])
                # skip header row
                next(reader)
                compare_records = list(reader)

        except subprocess.CalledProcessError as e:
            raise Exception("Process failed due to: {}".format(e.stderr))

    return {
        'compareRecords': compare_records
    }

#####################################################################################################################################################################
                                                                    ##### NGS #####
class NGSUploadRequest(BaseModel):
    sampleSheetContent: str

@app.post('/api/upload-ngs')
def upload_ngs_run_info(request: NGSUploadRequest):
    from io import StringIO

    sample_content = request.sampleSheetContent

    expected_number_of_samples = 24
    current_run_number = ''

    # skip Sirona row
    # start index at 1
    df = pd.read_csv(StringIO(sample_content), skiprows=1, header=None, names=['FK_TestMtilda', 'DnaExtractionNumber'], usecols=[0, 1])

    # add column for RunSampleNumber based on position in DF
    df['RunSampleNumber'] = range(1, len(df)+1)

    number_of_samples = len(df)

    # check that there are 24 samples in sample sheet
    # (2 control, 22 patient samples)
    if number_of_samples == expected_number_of_samples:
        # if true, write uploaded ngs run info to db

        # determine next run number
        current_run_number = db.get_prev_run_number() + 1

        df_dict = df.to_dict(orient='records')

        values = [(
                current_run_number,
                row['RunSampleNumber'],
                'SIRONA',
                row['FK_TestMtilda'],
                row['DnaExtractionNumber']
                   ) for row in df_dict]

        # write to db
        print('records inserted -- temp')
        db.insert_records('ngs_run_info', values)
    else:
        number_of_samples = len(df)

    return {
        'uploadedNumSamples': number_of_samples,
        'runNumber': current_run_number
    }

@app.get('/api/check-ngs-tray')
def check_ngs_tray(micronic_contents: str, run_number: int):

    micronic_contents = json.loads(micronic_contents)

    # get determined positions based on NGS sample sheet upload
    ngs_df = db.get_ngs_positions(run_number)
    micronic_df = pd.DataFrame(micronic_contents)

    from scripts.data_util import dataUtil

    dataUtil = dataUtil()

    diff_df = dataUtil.create_diff_df(ngs_df, micronic_df, join_on='micronic code', df2_col='location')
    diff_df.rename(columns={'location':'micronic file location'}, inplace=True)

    # use seq to sort by horizontal positions
    diff_df = diff_df.sort_values(by='seq').drop(columns=['seq'])
    diff_df.insert(0, "row number", range(1, len(diff_df) + 1))

    return {
        'diffDf': diff_df.to_dict(orient='records') if len(diff_df) != 0 else diff_df
    }

#####################################################################################################################################################################
                                                                ##### QUERY DATABASE #####
@app.get('/api/query-db')
def query_database(request: Request, query_type: str, input: str, sample_type: str):

    lgr.info('***** Query DB API call made! *****')

    data = db.get_database_records(query_type, input, sample_type)

    if len(data) == 0:
        data = "No results returned"
        lgr.info('No results returned')

    db.insert_audit_record("query_database", {**request.query_params})

    lgr.info('***** Query DB API call completed! *****')

    return {
        'table': data
    }

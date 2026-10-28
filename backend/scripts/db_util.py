import pymssql
import pandas as pd
import re

from datetime import datetime
from scripts.queries import *


class dbUtility:

    def __init__(self):
        self.mConn = self.db_connect('MTILDA')
        self.sConn = self.db_connect('SLOT')

                                                                ##### GENERIC DB FUNCTIONS #####

    def db_connect(self, db):

        if 'SERVER' not in os.environ:
            from config.set_creds import set_env_vars
            print('IN DEV -- SETTING ENVIRONMENT VARIABLES FOR {}'.format(db))
            set_env_vars()

        conn = pymssql.connect(server=os.environ['{}_SERVER'.format(db)],
                               user=os.environ['{}_USER'.format(db)],
                               password=os.environ['{}_PW'.format(db)],
                               database=os.environ['{}_DB_NAME'.format(db)])

        return conn

    # generic context for DB query executions
    def execute_get_db_query(self, db_pointer, query, params, table_cols=False, return_cols=True):

        with db_pointer() as cursor:
            cursor.execute(query, params)
            res = cursor.fetchall()

            if return_cols:
                cols = [col for col in cursor.description]
                # header formatting for query db functionalities
                if table_cols:
                    cols = [re.sub('_', ' ', col[0]) for col in cols]
                return cols, res

            return res

    # generic function to insert records
    # used for micronic code linking, location assignment,
    # and writing NGS run information
    def insert_records(self, table, values):

        query = build_insert_query(table)

        with self.sConn.cursor() as cursor:
            cursor.executemany(query, values)
            self.sConn.commit()
            print('{} records inserted into {}!'.format(cursor.rowcount, table))

####################################################################################################################################################################

                                                                ##### VALIDATE MICRONIC CODE FUNCTIONS #####

    # wrapper for checking extraction number validity
    def check_extraction_numbers(self, extraction_numbers, db_ens):

        existing_links_rows = []

        invalid_en, valid_en = self.check_extraction_number_valid(extraction_numbers, db_ens)

        all_valid_en = []

        if valid_en:
            existing_links, existing_links_rows = self.check_extraction_number_linked(valid_en)

            # capture all valid extraction numbers by filtering out any with existing micronic
            # codes
            all_valid_en = [i for i in valid_en if i not in existing_links]
        else:
            print('All extraction numbers entered were invalid!')

        return invalid_en, existing_links_rows, all_valid_en

    # tube_type is queried to check if the user is on the right tab when assigning
    # micronic codes
    def get_extraction_info(self, extraction_numbers):

        query = '''SELECT extraction_number, tube_type
                   FROM dbo.Dna_extractions
                   WHERE extraction_number IN %(extraction_numbers)s
        '''

        res = self.execute_get_db_query(self.mConn.cursor, query, {"extraction_numbers": extraction_numbers.split(',')}, return_cols=False)

        derived_en = [i[0] for i in res]
        tube_types = [i[1] for i in res]

        return derived_en, tube_types

    # since extractions are scanned in, need to check if the DNA extraction number exists - barcode integrity
    # can affect what is scanned
    # if any extraction numbers are invalid, a list with invalid extraction numbers will be returned
    # else an empty list will be returned
    # get tube_type associated with extraction number -- these will be used to determine
    # if the user is on the right tab. DNA extractions with nothing populating the 'tube_type'
    # column are genomic dna samples
    def check_extraction_number_valid(self, extraction_numbers, db_extraction_numbers):

        extraction_numbers_split = [num for num in extraction_numbers.split(',')]

        valid_extraction_numbers = [str(i) for i in db_extraction_numbers]

        if len(valid_extraction_numbers) != len(extraction_numbers_split):
            invalid = [num for num in extraction_numbers_split if num not in valid_extraction_numbers]
            #  structure needed to create table in JS
            invalid_records = [{'invalid extraction numbers': n} for n in invalid]
            return invalid_records, valid_extraction_numbers
        return [], valid_extraction_numbers

    # function to check if the provided extraction number is already linked to another micronic code
    def check_extraction_number_linked(self, extraction_numbers):

        query = '''
                SELECT MT_DnaExtractionNumber, MicronicCode
                FROM dbo.mc_dna_extraction_number
                WHERE MT_DnaExtractionNumber in %(extraction_numbers)s
        '''

        res = self.execute_get_db_query(self.sConn.cursor, query, {"extraction_numbers": extraction_numbers}, return_cols=False)

        en_linked = [str(i[0]) for i in res]

        # prepare returned data in row format for table creation in front-end
        en_linked_rows = [{'linked extraction number': str(item[0]), 'linked micronic code': item[1]} for item in res]

        return en_linked, en_linked_rows

#####################################################################################################################################################################

                                                        ##### MICRONIC CODE SPECIFIC FUNCTIONS #####

    # check if purity ratio + dna concentration values were entered before linking for gDNA
    # DNA concentration only for chi sx
    def check_req_fields(self, rows, dna_type):
        cols = ['purity_ratio', 'dna_concentration'] if dna_type == 'Genomic DNA' else ['dna_concentration']

        extraction_numbers = [r['extraction number'] for r in rows]

        query = '''
        SELECT extraction_number, {}
        FROM Dna_extractions
        WHERE extraction_number in %(extraction_numbers)s
        '''.format(', '.join(cols))

        cols, res = self.execute_get_db_query(self.mConn.cursor, query, {"extraction_numbers": extraction_numbers}, return_cols=True, table_cols=True)

        df = pd.DataFrame(res, columns=cols)

        # replace NaNs (NULL in database) and empty strings with ""
        # these will be populated with the MISSING style on the front end

        # turn all columns in df to string data type for JSON serialization -- integers will be coerced to
        # string anyway
        # blanks and NULL will be captured as missing values
        is_blank = df.isna() | df.astype(str).apply(lambda s: s.str.strip().eq(''))
        missing_vals = df[is_blank.any(axis=1)]
        missing_vals = missing_vals.where(~is_blank, '').astype(str)

        missing_vals.columns = missing_vals.columns.str.replace('_', ' ')

        return missing_vals

    # function to insert valid extraction numbers and their associated micronic code to the db
    def insert_micronic_codes(self, table, rows, sample_type):
        query = build_insert_query(table)

        # insert sample type
        # G = Genomic DNA
        # C = Chimerism
        dna_type = 'G' if sample_type == 'Genomic DNA' else 'C'

        values = [(
            int(row['extraction number']),
            row['micronic code'],
            'WIN\\{}'.format(os.environ['WINDOWS_USERNAME']),
            datetime.now().strftime('%Y-%m-%d %H:%M:%S.%f')[:-3],
            dna_type
        ) for row in rows]

        with self.sConn.cursor() as cursor:
            cursor.executemany(query, values)
            self.sConn.commit()
            print('{} records inserted into mc_dna_extraction_number!'.format(cursor.rowcount))

#####################################################################################################################################################################

                                ##### FREEZER BOX BARCODE ASSIGNMENT DB FUNCTIONS #####

    # function to get previous box, box currently being assigned, and future box
    def get_fb_info(self, table):

        query = '''
            --current box PK
            SELECT TOP 1
            fb.PK, fb.BoxName,
            --previous box barcode and box name
            (SELECT TOP 1 BoxBarcode FROM dbo.{db_table} where PK < fb.PK ORDER BY PK DESC) as prev_barcode,
            (SELECT TOP 1 BoxName FROM dbo.{db_table} where PK < fb.PK ORDER BY PK DESC) as prev_box,
            --future box
            (SELECT TOP 1 BoxName FROM dbo.{db_table} where PK > fb.PK ORDER BY PK ASC) as future_box
            FROM dbo.{db_table} fb
            WHERE fb.BoxBarcode IS NULL
            ORDER BY fb.PK
        '''.format(db_table=table)

        res = self.execute_get_db_query(self.sConn.cursor, query, "", return_cols=False)[0]

        return res

    # function to return the remaining number of unassigned boxes after the new box has been assigned
    def get_remaining_num_boxes(self, freezer_name, table):

        query = '''
        SELECT COUNT(*) 
        FROM dbo.{}
        WHERE freezer = '{}' AND BoxBarcode IS NULL
        '''.format(table, freezer_name)

        res = self.execute_get_db_query(self.sConn.cursor, query, "", return_cols=False)[0][0]

        return res

    # function to check if the current box that was just assigned is one of the last 24 boxes
    def check_last_boxes(self, box_name, query_table):

        freezer = box_name.split('_')[0]

        # 654 rows per freezer
        remaining_boxes = self.get_remaining_num_boxes(freezer, query_table)

        if remaining_boxes <= 24:
            return 'Remaining Boxes for {}: {}'.format(freezer, remaining_boxes)
        else:
            return ''

    # function to assign the entered barcode to the next box
    def update_fb_barcode(self, barcode, table, box):

        query = '''
            UPDATE {}
            SET BoxBarcode = %(barcode)s 
            WHERE BoxName = '{}'
        '''.format(table, box)

        with self.sConn.cursor() as cursor:
            cursor.execute(query, {"barcode": barcode})
            self.sConn.commit()
            print('{} records updated in {}!'.format(cursor.rowcount, table))


#####################################################################################################################################################################

                                            ##### FREEZER LOCATION ASSIGNMENT DB FUNCTIONS / SAMPLE CHECKLIST #####

    # function to get associated extraction numbers with scanned in micronic codes
    def get_extraction_numbers(self, codes):

        # initialize valid Boolean. If any codes are missing, change to False
        valid = True
        codes = codes.split(',')

        query = '''
        SELECT MT_DnaExtractionNumber, MicronicCode
        FROM dbo.mc_dna_extraction_number
        WHERE MicronicCode IN %(codes)s
        '''

        res = self.execute_get_db_query(self.sConn.cursor, query, {"codes": codes}, return_cols=False)

        if len(res) != 0:
            # if all micronic codes were found, return linked records (list of objects) with micronic code and
            # extraction numbers

            if len(res) == len(codes):
                code_order = {code: i for i, code in enumerate(codes)}

                # reformat SQL output to match input sequence of micronic output file
                res = sorted(res, key=lambda x: code_order[x[1]])

                result_dict = [{'extraction number': i[0], 'micronic code': i[1]} for i in res]

                return result_dict, valid

            # some invalid codes
            else:
                valid = False
                invalid_codes = [{'invalid/unlinked micronic codes': j} for j in codes if j not in [i[1] for i in res]]
                return invalid_codes, valid
        # all invalid codes
        else:
            valid = False
            return [{'invalid/unlinked micronic codes': i} for i in codes], valid

    # function to check if scanned in micronic code has already been assigned a location
    def check_micronic_code_assigned(self, tab_prefix, micronic_codes):
        assigned_codes = ''
        valid = True

        query = ''' 
        SELECT fb.BoxName, mtb.Location, mtb.MicronicCode, mcen.MT_DnaExtractionNumber
        FROM dbo.{tab}_micronic_tubes mtb
        INNER JOIN dbo.{tab}_freezer_boxes fb
        ON mtb.FK_FreezerBox = fb.PK
        LEFT JOIN dbo.mc_dna_extraction_number mcen
		ON mtb.MicronicCode = mcen.MicronicCode
        WHERE mtb.MicronicCode IN %(micronic_codes)s
        '''.format(tab=tab_prefix)

        res = self.execute_get_db_query(self.sConn.cursor, query, {"micronic_codes": micronic_codes}, return_cols=False)

        # if the query returns results, it means a scanned in micronic code has already been assigned a location
        if res:
            valid = False

            # sort by order of appearance in micronic codes
            code_order = {code: i for i, code in enumerate(micronic_codes)}
            res = sorted(res, key=lambda x: code_order[x[2]])

            assigned_codes = [{'location': i[0] + '/' + i[1], 'micronic code': i[2], 'extraction number': i[3]} for i in res]

        return assigned_codes, valid

    # function to check if provided freezer box barcode is valid
    def check_freezer_barcode(self, table_type, fb_barcode):

        valid = True

        query = '''
        SELECT PK, BoxName
        FROM {}_freezer_boxes
        WHERE BoxBarcode = %(barcode)s
        '''.format(table_type)

        res = self.execute_get_db_query(self.sConn.cursor, query, {"barcode": fb_barcode}, return_cols=False)

        if len(res) == 0:
            valid = False
            return '', valid

        return res[0], valid

    # function to get occupied positions
    # if nothing is returned, that means it's a new box!
    def get_occupied_positions(self, table_type, fb_barcode):

        query = '''
            WITH last_position AS (SELECT TOP 1 tubes.Location
            FROM {dna}_micronic_tubes tubes
            INNER JOIN dbo.{dna}_freezer_boxes fb
            ON fb.PK = tubes.FK_FreezerBox
            LEFT JOIN ngs_dilution_sample_map map
            ON tubes.Location = map.PositionName
            WHERE fb.BoxBarcode = %(barcode)s
            ORDER by map.pk DESC)

            SELECT positionname
            FROM ngs_dilution_sample_map
            WHERE pk <= (select pk
            FROM ngs_dilution_sample_map 
            WHERE PositionName = (SELECT location FROM last_position))
        '''

        query = query.format(dna=table_type)

        res = self.execute_get_db_query(self.sConn.cursor, query, {"barcode" : fb_barcode}, return_cols= False)

        if len(res) == 0:
            return ''

        occupied_positions = [i[0] for i in res]

        return occupied_positions

    # function to insert newly assigned locations to samples into the <>_micronic_tubes table, where <> is the sample
    # type (gdna for Genomic DNA, chi for Chimerism)
    def insert_assigned_locations(self, pk, rows, table):

        query = build_insert_query(table)

        values = [(
            # FK_FreezerBox
            pk,
            # Location,
            row['location'],
            # MicronicCode
            row['micronic code'],
            # RecordCreatedWhen
            datetime.now().strftime('%Y-%m-%d %H:%M:%S.%f')[:-3],
            # RecordCreatedBy
            'WIN\\{}'.format(os.environ['WINDOWS_USERNAME'])
        ) for row in rows]

        with self.sConn.cursor() as cursor:
            cursor.executemany(query, values)
            self.sConn.commit()
            print('{} records inserted into {}!'.format(cursor.rowcount, table))

    # function to update location column in Dna_extractions table with new location
    def update_assigned_location(self, rows):

        values = [(
            row['location'],
            row['extraction number']
        ) for row in rows]

        query = '''
        UPDATE dbo.Dna_extractions
        SET location = %s
        WHERE extraction_number = %s
        '''

        with self.mConn.cursor() as cursor:
            cursor.executemany(query, values)
            self.mConn.commit()
            print('{} records updated in Dna_extractions!'.format(cursor.rowcount))

#####################################################################################################################################################################

                                                            ##### VERIFY TUBE LOCATION DB FUNCTIONS #####

    # function to get all samples in a given box
    # used for verify tube location functionality
    def get_box_contents(self, fb_pk, prefix):

        query = '''
        SELECT Location, MicronicCode
        FROM {}_micronic_tubes
        WHERE FK_FreezerBox = {}
        '''.format(prefix, fb_pk)

        with self.sConn.cursor() as cursor:
            cursor.execute(query)
            res = cursor.fetchall()

        box_contents = pd.DataFrame(res, columns=['location', 'database entry'])

        return box_contents

#####################################################################################################################################################################

                                                            ##### NGS DB FUNCTIONS #####

    # function to get the last used run number for NGS
    def get_prev_run_number(self):

        query = '''
        SELECT DISTINCT MAX(FK_RunNumber)
        FROM ngs_run_info
        '''

        with self.sConn.cursor() as cursor:
            cursor.execute(query)
            res = cursor.fetchall()
            prev_run_number = res[0][0]

        return prev_run_number

    # function to get the expected positions of each sample in an NGS run
    # based on uploaded NGS sample sheet
    def get_ngs_positions(self, run_number):

        query = '''
        SELECT m.MicronicCode, position.DnaExtractionNumber, position.PositionName, position.RunSampleNumber 
        FROM mc_dna_extraction_number m
        INNER JOIN (SELECT n.DnaExtractionNumber, map.PositionName, n.RunSampleNumber
        FROM ngs_run_info n
        INNER JOIN ngs_dilution_sample_map map
        ON n.RunSampleNumber = map.PK
        WHERE n.FK_RunNumber = {}
        ) AS position
        ON position.DnaExtractionNumber = m.MT_DnaExtractionNumber
        ORDER BY position.RunSampleNumber
        '''.format(run_number)

        with self.sConn.cursor() as cursor:
            cursor.execute(query)
            res = cursor.fetchall()

        df = pd.DataFrame(res, columns=['micronic code', 'dna extraction number', 'database entry', 'seq'])

        return df

#####################################################################################################################################################################

                                                            ##### QUERY DB FUNCTIONS #####

    # QUERY DB - EXTRACTION NUMBER
    def execute_db_extraction_num(self, input, sample):

        if sample == 'Genomic DNA':
            cols = 'purity_ratio'
            sample_type = 'G'
        else:
            cols = 'purity_ratio, tube_type as subset'
            sample_type = 'C'

        cols = 'purity_ratio, TRIM(dna_concentration) as dna_concentration' if sample == 'Genomic DNA' else 'TRIM(dna_concentration) as dna_concentration'

        # SLOT query
        query = '''SELECT CAST(MT_DNAExtractionNumber AS varchar) as extraction_number, MicronicCode AS micronic_code
                    FROM mc_dna_extraction_number
                    WHERE MT_DnaExtractionNumber = %(extraction_number)s
                    AND SampleType = '{}'
                '''.format(sample_type)

        slot_return = self.execute_get_db_query(self.sConn.cursor, query, {"extraction_number": input}, True)

        # mTilda query
        query = '''SELECT CAST(extraction_number AS varchar) as extraction_number, CAST(sample_number AS varchar) AS sample_number, {dna_cols}, location
                   FROM dna_extractions
                   WHERE extraction_number = %(extraction_number)s
        '''.format(dna_cols=cols)

        mtilda_return = self.execute_get_db_query(self.mConn.cursor, query, {"extraction_number": input}, True)

        records = pd.DataFrame(slot_return[1], columns=slot_return[0]).merge(pd.DataFrame(mtilda_return[1], columns=mtilda_return[0])).drop(columns="extraction number").to_dict(orient='records')

        return records

    # QUERY DB - SAMPLE NUMBER
    def execute_db_sample_num(self, input):

        query='''SELECT tube_type as subset, CAST(extraction_number AS varchar) AS extraction_number, location
                    FROM dna_extractions
                    WHERE sample_number = %(sample_number)s'''

        mtilda_return = self.execute_get_db_query(self.mConn.cursor, query, {"sample_number": input}, True)

        # use extraction numbers from sample to look up micronic codes
        extraction_numbers = [i[1] for i in mtilda_return[1]]

        query = '''
                    SELECT CAST(MT_DnaExtractionNumber AS varchar) AS extraction_number, MicronicCode AS micronic_code
                    FROM mc_dna_extraction_number
                    WHERE MT_DnaExtractionNumber IN %(extraction_number)s
                  '''

        slot_return = self.execute_get_db_query(self.sConn.cursor, query, {"extraction_number": extraction_numbers}, True)

        # combine the two returns by converting to panda df and merging by extraction number
        # convert to records
        records = pd.DataFrame(mtilda_return[1], columns=mtilda_return[0]).merge(pd.DataFrame(slot_return[1], columns=slot_return[0]), on="extraction number").to_dict(orient='records')

        return records

    # QUERY DB - BOX BARCODE NUMBER
    def execute_db_box_barcode(self, input, sample):

        dna_type = 'gdna' if sample == 'Genomic DNA' else 'chi'

        query = '''SELECT e.MT_DnaExtractionNumber as extraction_number, t.MicronicCode as micronic_code, b.boxname as box, t.location
                    FROM {prefix}_freezer_boxes b
                    INNER JOIN {prefix}_micronic_tubes t
                    ON b.pk = t.FK_FreezerBox
                    INNER JOIN mc_dna_extraction_number e
                    ON t.MicronicCode = e.MicronicCode
                    WHERE BoxBarcode = %(barcode)s
                    ORDER BY t.location'''

        query = query.format(prefix=dna_type)

        cols, rows = self.execute_get_db_query(self.sConn.cursor, query, {"barcode": input}, True)

        records = [dict(zip(cols, row)) for row in rows]

        return records

    # wrapper function for getting and formatting tables from selected query type
    def get_database_records(self, query_type, input, sample=""):

        match query_type:
            case "Extraction #":
                records = self.execute_db_extraction_num(input, sample)
            case "Box Barcode #":
                records = self.execute_db_box_barcode(input, sample)
            case "Sample #":
                records = self.execute_db_sample_num(input)

        return records

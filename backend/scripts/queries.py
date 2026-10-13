import os
from datetime import datetime

location_assignment_cols = ['FK_FreezerBox', 'Location', 'MicronicCode', 'RecordCreatedWhen', 'RecordCreatedBy']

#columns to write to
write_queries = {
    'mc_dna_extraction_number': ['MT_DnaExtractionNumber', 'MicronicCode', 'RecordCreatedBy', 'RecordCreatedWhen', 'SampleType'],
    'gdna_micronic_tubes': location_assignment_cols,
    'chi_micronic_tubes': location_assignment_cols,
    'ngs_run_info': ['FK_RunNumber', 'RunSampleNumber', 'Method', 'FK_TestMtilda', 'DnaExtractionNumber']
}

# SQL queries for Query Database functionality
database_sql_queries = {
    "Extraction #": ('''SELECT sample_number, {dna_cols}, location
                        FROM dna_extractions
                        WHERE extraction_number = %(extraction_number)s''',
                        lambda vals: {"extraction_number": vals["input"]}),
    "Box Barcode #": ('''SELECT e.MT_DnaExtractionNumber as extraction_number, t.MicronicCode as micronic_code, b.boxname as box, t.location
                     FROM {prefix}_freezer_boxes b
                     INNER JOIN {prefix}_micronic_tubes t
                     ON b.pk = t.FK_FreezerBox
                     INNER JOIN mc_dna_extraction_number e
                     ON t.MicronicCode = e.MicronicCode
                     WHERE BoxBarcode = %(barcode)s 
                     ORDER BY t.location''', lambda vals: {"barcode": vals["input"]}),
    "Sample #": ('''SELECT tube_type as subset, extraction_number, location
                     FROM dna_extractions
                     WHERE sample_number = %(sample_number)s''', lambda vals: {"sample_number": vals["input"]})
}

def build_insert_query(table):

    cols = write_queries.get(table)
    values = ', '.join(['%s'] * len(cols))


    query = '''
        INSERT INTO {} ({})
        VALUES ({})
    '''.format(table, ','.join(cols), values)

    return query



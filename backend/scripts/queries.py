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

def build_insert_query(table):

    cols = write_queries.get(table)
    values = ', '.join(['%s'] * len(cols))


    query = '''
        INSERT INTO {} ({})
        VALUES ({})
    '''.format(table, ','.join(cols), values)

    return query



import boto3
import os

config = {
    'SLOT_SERVER': 'slot_db_server',
    'SLOT_USER':  'slot_db_username',
    'SLOT_PW': 'slot_db_password',
    'MTILDA_SERVER': 'mtilda_dev_db_server',
    'MTILDA_USER': 'mtilda_prod_db_username',
    'MTILDA_PW': 'mtilda_prod_db_pw'
}

def set_env_vars():

    ssm = boto3.client('ssm', region_name='us-west-2')

    for k,v in config.items():
        os.environ[k] = ssm.get_parameter(Name=v, WithDecryption=True)['Parameter']['Value']
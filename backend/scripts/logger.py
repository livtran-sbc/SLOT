import os
import logging

log_directory = ""

def get_logger():

    # for deployment to local server, define a log name so it's logged to a file
    # once deployed as a web app, SLOT logging will only log to stdout, captured by splunk
    log_name = "SLOT.log"

    # temporary! will remove logging to a file once deployed as web app
    directory = log_directory

    log_file_path = os.path.join(directory, log_name)

    logger = logging.getLogger(log_name)

    if logger.hasHandlers():
        return logger

    logger.setLevel(logging.INFO)

    #write to file
    file_handler = logging.FileHandler(log_file_path)
    file_handler.setLevel(logging.INFO)

    #write to stdout
    stream_handler = logging.StreamHandler()
    stream_handler.setLevel(logging.INFO)

    sunet = os.environ['WINDOWS_USERNAME']

    formatter = logging.Formatter(f"%(asctime)s %(levelname)s [{sunet}] %(message)s")

    file_handler.setFormatter(formatter)
    stream_handler.setFormatter(formatter)

    logger.addHandler(file_handler)
    logger.addHandler(stream_handler)

    logger.log_file_name = log_name

    return logger


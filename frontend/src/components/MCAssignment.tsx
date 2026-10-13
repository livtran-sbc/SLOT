import {
  FileUploader,
  VisibleFileUploader,
  InputButton,
  SampleNumberInput,
} from "./InputComponents";
import { useTabData } from "./TabInputContext";
import { createDataArray, CreateTable } from "./CreateTable";
import {
  useErrorModal,
  ErrorModal,
  ErrorMessage,
  ErrorDetails,
} from "./ErrorComponents";
import { Check, X } from "lucide-react";

import { TableDataContentTypes } from "./types";

export default function MCAssignment() {
  const {
    tabInputs,
    updateTabInputs,
    resetButton,
    readFileContent,
    selectedPanel,
    handleEnter,
    micronicFileRef,
  } = useTabData()!;

  const tabNum = "mcTab";
  const fileContent = tabInputs[tabNum].tableData;
  const rawContent = tabInputs[tabNum].mcFileContent;

  const handleLink = async () => {
    try {
      const response = await fetch("/api/link-micronic-codes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          table: "mc_dna_extraction_number",
          rows: fileContent,
          dna_type: selectedPanel,
        }),
      });

      // error handling
      if (!response.ok) {
        const error = await response.json();
        console.log(error);

        const errorObj = {
          status: response.status,
          message: error.detail[0]?.msg || error.detail,
        };

        throw errorObj;
      }

      const data = await response.json();
      const { invalidExtractions, invalidLinks, missingVals, tabCheck } = data;
    

      if(!tabCheck) {
      
      updateTabInputs(tabNum, {
        linkClicked: true,
        tableData: (fileContent as TableDataContentTypes).map((row) => ({
          ...row,
          linked: <X stroke="red" />
        })),
      });

        showError(
          <>
            <h5>
              The DNA Extraction numbers entered do not align with the selected sample type. Please double check
              the selected sample type is correct.
            </h5>
          </>)

          return;
      }

      const invalidLinksExtractionNumber = invalidLinks.map(
        (row: { "linked extraction number": string }) =>
          row["linked extraction number"],
      );

      const invalidExtractionNumbers = invalidExtractions.map(
        (row: { "invalid extraction numbers": string }) =>
          row["invalid extraction numbers"],
      );

      const missingRequiredVals = missingVals.map(
        (row: { "extraction number": string }) => row["extraction number"],
      );

      updateTabInputs(tabNum, {
        linkClicked: true,
        tableData: (fileContent as TableDataContentTypes).map((row) => ({
          ...row,
          linked:
            invalidExtractionNumbers.includes(row["extraction number"]) ||
            invalidLinksExtractionNumber.includes(row["extraction number"]) ||
            missingRequiredVals.includes(row["extraction number"]) ? (
              <X stroke="red" />
            ) : (
              <Check stroke="#0FFA45" />
            ),
        })),
      });
      
      //show error modal if there are any invalid extractions or any extractions already linked to another MC
      (invalidExtractions.length > 0 ||
        invalidLinksExtractionNumber.length > 0 ||
        missingVals.length > 0) &&
        showError(
          <>
            <h5 style={{ marginBottom: "15px" }}>
              Some Micronic Codes failed to link!
            </h5>

            {/* show invalid extraction numbers */}
            {invalidExtractions.length > 0 && (
              <div className="error-details-container">
                <ErrorDetails
                  errorType={`Invalid DNA Extraction Numbers [${invalidExtractions.length}]`}
                  content={<CreateTable data={invalidExtractions} />}
                />
              </div>
            )}

            {/* show extraction numbers already linked */}

            {invalidLinks.length > 0 && (
              <div className="error-details-container">
                <ErrorDetails
                  errorType={`Already Linked Micronic Codes [${invalidLinks.length}]`}
                  content={<CreateTable data={invalidLinks} />}
                />
              </div>
            )}

            {/* show table if any required values are missing */}

            {missingVals.length > 0 && (
              <div className="error-details-container">
                <ErrorDetails
                  errorType={`Missing Quantification Values [${missingVals.length}]`}
                  content={<CreateTable data={missingVals} />}
                />
              </div>
            )}
          </>,
        );
    } catch (error) {
      console.log(error);
      const typedError = error as { status: number; message: string };

      showError(<ErrorMessage process="Micronic Linking" error={typedError} />);

      // set linked column to X

      updateTabInputs(tabNum, {
        linkClicked: true,
        tableData: (fileContent as TableDataContentTypes).map((row) => ({
          ...row,
          linked: <X stroke="red" />,
        })),
      });
    }
  };

  const handleUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files![0];
    readFileContent(file, (content) => {
      updateTabInputs(tabNum, { mcFile: file.name, mcFileContent: content });
    });
  };

  const filterTable = (enteredSamples: number, content: string) => {
    const data = createDataArray(content, tabNum, enteredSamples);

    if (
      (data as TableDataContentTypes).some(
        (obj: TableDataContentTypes[number]) => !obj["micronic code"],
      )
    ) {
      showError(
        <h5>
          Some Micronic Codes failed to scan. Please take note of the missing Micronic Codes in the displayed table, re-scan, and try again.
        </h5>
      );
    }

    updateTabInputs(tabNum, {
      numSamples: enteredSamples,
      tableData: data as TableDataContentTypes,
    });

          console.log(tabInputs[tabNum]);

  };

  //check all extraction number rows are populated - informs disabled attribute for the 'Link Micronic Codes!' button
  const allRequiredPopulated =
    fileContent && fileContent.every((obj) => obj["extraction number"]);

  const { show, message, showError, hideError } = useErrorModal();

  const handleTableChange = (newData: TableDataContentTypes) => {
    updateTabInputs(tabNum, { tableData: newData });
  };
  
  return (
    <>
      <div className="mc-wrapper">
        <div className="mc-input-wrapper">
          <div className="mc-upload-wrapper">
            <h4 style={{ marginBottom: "15px" }}>
              Upload Micronic Output File
            </h4>
            <FileUploader
              action="input"
              onUpload={handleUpload}
              tabNum={tabNum}
              fileRef={micronicFileRef}
              id='mc-uploader'
              uploadType = 'micronic'
              disabled={tabInputs[tabNum].tableData != ""}
            />
            <VisibleFileUploader
              fileName={tabInputs[tabNum].mcFile}
              id='mc-uploader'
              style="mc"
              disabled={tabInputs[tabNum].tableData != ""}
            />
          </div>
          {
            <>
              <div className="separator"></div>
              <div className="num-samples">
                <SampleNumberInput
                  value={tabInputs[tabNum]["numSamples"] ?? ""}
                  tabNum={tabNum}
                  handleEnter={handleEnter}
                  title="Number of Samples"
                  heading={true}
                  disabled={tabInputs[tabNum].tableData !== ""}
                  textboxStyle="center"
                />
                <div className="input-wrapper-mc">
                  <InputButton
                    label="Enter"
                    style="enter-button"
                    handleClick={() => {
                      filterTable(
                        Number(tabInputs[tabNum].numSamples),
                        rawContent,
                      );
                    }}
                    disabled={
                      tabInputs[tabNum].numSamples === null ||
                      rawContent === "" ||
                      tabInputs[tabNum].tableData !== ""
                    }
                  />
                </div>
              </div>
            </>
          }
        </div>
      </div>

      <div className="summary-section-style">
        {fileContent && tabInputs[tabNum].numSamples !== null && (
          <div className="mc-table-wrapper">
            <div className="mc-table">
              <CreateTable
                data={tabInputs[tabNum].tableData as TableDataContentTypes}
                handleChange={handleTableChange}
                micronicCodeTable={true}
              />
            </div>
            <div className="link-mc-container">
              <InputButton
                label="Link Micronic Codes!"
                style="enter-button"
                disabled={
                  !allRequiredPopulated || tabInputs[tabNum].linkClicked
                }
                handleClick={() => handleLink()}
              />
              <InputButton
                label="Reset"
                style="reset-button"
                handleClick={() => resetButton(tabNum, true)}
              />
            </div>
          </div>
        )}

        {show && <ErrorModal message={message} onClose={hideError} />}
      </div>
    </>
  );
}

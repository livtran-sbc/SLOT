import {
  InputButton,
  TextInputTabs,
  FileUploader,
  VisibleFileUploader,
  SampleNumberInput,
} from "./InputComponents";
import { useTabData } from "./TabInputContext";

import { NumberSamplesUIProps, SampleChecklistTabs } from "./types";
import { createDataArray, CreateTable } from "./CreateTable";

import {
  useErrorModal,
  ErrorMessage,
  ErrorModal,
  ErrorDetails,
} from "./ErrorComponents";

import { TabStateTypes, TabInputsTypes, MicronicUploadUIProps } from "./types";
import { useState } from "react";
import { Bars } from "react-loader-spinner";

function MicronicUploadUI({ tabInfo, tab, handleUpdates, micronicRef }: MicronicUploadUIProps) {
  return (
    <>
      <div className="file-input-wrapper">
        <FileUploader
          onUpload={handleUpdates}
          id={"mc-uploader"}
          action="upload"
          uploadType="micronic"
          tabNum={tab}
          fileRef={micronicRef}
        />
        <VisibleFileUploader
          fileName={tabInfo.mcFile}
          id={"mc-uploader"}
          style="sc"
          disabled={tabInfo.validateClicked}
        />
      </div>
    </>
  );
}

function NumberSamplesUI({ numBool, tabInfo, tab, handleClick }: NumberSamplesUIProps) {
  return (
    <div className="vt-checklist-wrapper">
      <div className="input-label-wrapper">
        <input
          type="checkbox"
          id="num-samples-checkbox"
          name="samples-checkbox"
          checked={numBool}
          readOnly
        />
        <label htmlFor="samples-checkbox"> Number of Samples</label>
      </div>
      <SampleNumberInput
        value={tabInfo.numSamples}
        tabNum={tab}
        handleEnter={handleClick}
        title=""
        style="sc-barcode-style"
        heading={false}
        disabled={tabInfo.actionButtonClicked}
      />
    </div>
  );
}
// checklist UI 
export default function SampleChecklist({ tabNum }: SampleChecklistTabs) {
  const {
    tabInputs,
    updateTabInputs,
    resetButton,
    selectedPanel,
    readFileContent,
    micronicFileRef,
    ttxFileRef,
    sampleFileRef,
    handleEnter,
  } = useTabData()!;

  const { show, message, showError, hideError } = useErrorModal();

  // unchecks the box barcode checkbox if nothing is input
  const numSamplesBool = tabInputs[tabNum].numSamples !== "";

 const firstCheckboxBool =
    tabNum !== "ngsTab" ? tabInputs[tabNum].mcCheckbox : tabInputs[tabNum].sampleCheckbox;

  const currentTabObjects = tabInputs[tabNum];

  const isScanned = "barcode" in currentTabObjects && currentTabObjects.barcode.trim() !== ""

  const handleChecklistUpdates = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>,
    tabNum: TabStateTypes,
    uploadType?: string,
    action = "none"
  ) => {
    let updateObject;

    if (action === "upload") {
      if (e.target instanceof HTMLInputElement) {
        const file = e.target.files?.[0];
        if (file) {
          if (uploadType === "micronic") {
            readFileContent(file, (content) => {
              updateTabInputs(tabNum, {
                mcFile: file.name,
                mcFileContent: content,
                mcCheckbox: true,
              });
            });
          } else if (uploadType === "ttx") {
            readFileContent(file, (content) => {
              updateTabInputs(tabNum, {
                ttxFile: file.name,
                ttxFileContent: content,
                ttxCheckbox: true,
              });
            });
          } else {
            readFileContent(file, (content) => {
              updateTabInputs(tabNum, {
                sampleSheet: file.name,
                sampleSheetContent: content,
                sampleCheckbox: true,
              });
            });
          }
          //reset upload UI value state so if a file with the same name is re-uploaded, it registers
          e.target.value = "";
        }
      }
      return;
    } else {
      updateObject = {
        barcode: e.target.value.replace(/\D/g, ""),
      };
    }
    updateTabInputs(tabNum, updateObject);
  };

  // function to  validate micronic file -- are the entered number of samples
  // the same as the number of samples specified? this serves as a backup if the LT
  // did not catch a micronic code not being scanned
  const validateMicronicFile = async () => {

    updateTabInputs(tabNum, {validateClicked: true})

    try {
      const dataArray = createDataArray(
        tabInputs[tabNum].mcFileContent,
        tabNum,
        Number(tabInputs[tabNum].numSamples),
      );

      //check if any micronic codes are missing from the filtered down file
      if (!dataArray.map((row) => !row["micronic code"]).some(Boolean)) {
        
        //call API if no missing micronic codes
        const micronicCodes = dataArray
          .map((row) => row["micronic code"])
          .join(",");

        // call to API to check Micronic Code is linked to an extraction number
        // retrieves extraction number if yes
        const response = await fetch(
          `/api/validate-micronic-file?micronic_codes=${micronicCodes}`,
        );

        //exception handling
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

        // if invalid boolean flag is false, update tab inputs
        if (data.valid) {

          const locationCode = Object.fromEntries(dataArray.map(r => [r['micronic code'], r['location']]))

          console.log(dataArray)

          updateTabInputs(tabNum, {
            locationMicronicCodes: dataArray,
            extractionNumbersMicronicCodes: data['results'].map((row: {'extraction number': string, 'micronic code': string}) => ({...row, 'location': locationCode[row['micronic code']]})),
            showValidate: false          
          });

        } else {
          showError(
            <>
              <h5 style={{ marginBottom: "15px" }}>
                Issues with Micronic Codes detected!
              </h5>
              <div className="error-details-container">
                <ErrorDetails
                  errorType={`Problematic Micronic Codes [${data["results"].length}]`}
                  content={<CreateTable data={data["results"]} />}
                />
              </div>
              <p className="error-message-margin">
                Please double check the Micronic Output file and re-scan if
                necessary. Upload the corrected Micronic Output file and
                re-validate to continue.
              </p>
            </>,
          );
        }
      } else {
        // missing micronic codes detected
        showError(
          <>
            <h5 style={{ marginBottom: "15px" }}>
              Missing Micronic Codes Detected!
            </h5>

            <CreateTable data={dataArray} micronicCodeTable={true} />
            <p className="error-message-margin">
              Please double check the Micronic Output file and re-scan if
              necessary. Upload the corrected Micronic Output file and
              re-validate to continue.
            </p>
          </>,
        );
      }
    } catch (error) {
      console.log(error);
      const typedError = error as { status: number; message: string };

      showError(
        <ErrorMessage
          process="Freezer Location Assignment"
          error={typedError}
        />,
      );
    }
  };

  // ASSIGN FREEZER LOCATION //
  // function to assign location to scanned in micronic outputs
  // if any micronic codes have previously been assigned a location,
  // an array containing the micronic codes + the box and location will be
  // returned. otherwise, an array containing micronic codes with their
  // newly assigned locations will be returned
  const assignFreezerLocation = async () => {
    updateTabInputs("flTab", { actionButtonClicked: true });

    try {
      const response = await fetch("/api/assign-freezer-location", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          en_mcodes: tabInputs["flTab"].extractionNumbersMicronicCodes,
          barcode: tabInputs["flTab"].barcode,
          dna_type: selectedPanel,
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        console.log(error);

        const errorObj = {
          status: response.status,
          message: error.detail[0]?.msg || error.detail,
        };

        throw errorObj;
      } else {
        const data = await response.json();

        //if data valid flag is invalid, display previously linked micronic codes
        //along with their locations
        if (!data.mcValid) {
         if(data.newSlots ===0){
          showError(
            <>
              <h5 style={{ marginBottom: "15px" }}>
                No new samples detected in uploaded Micronic Output!
              </h5>

              <p style={{ margin: "25px 0px 0px" }}>
                Based on what is populated in the database for the scanned in box,
                no new samples were detected in the uploaded Micronic Output file.
              </p>
            </>,
          );
          } else{
          showError(
            <>
              <h5 style={{ marginBottom: "15px" }}>
                Micronic Code Assignment Duplication Error!
              </h5>

              <CreateTable data={data.results} />

              <p style={{ margin: "25px 0px 0px" }}>
                The outlined Micronic Codes have already been assigned a
                location. Please double check samples.
              </p>
            </>,
          );
        } }else if (!data.fbValid) {
          showError(
            <>
              <h5 style={{ marginBottom: "15px" }}>
                Freezer Box Barcode Not Found!
              </h5>
              <div className="error-message-margin">
                <p className="error-message-font">
                  Entered barcode:{" "}
                  <span style={{ backgroundColor: "yellow" }}>
                    {tabInputs["flTab"].barcode}{" "}
                  </span>
                </p>
                <p>
                  Please double check the scanned barcode and make sure the
                  correct DNA type is selected. If this is a new box, please
                  make sure the box has been assigned a barcode.
                </p>
              </div>
            </>,
          );
        } else {
          if (data.numSlotsValid) {
            updateTabInputs(tabNum, { returnedData: data.results });
          } else {
            showError(
              <>
                <h5 style={{ marginBottom: "15px" }}>
                  Sample Location Assignment Error!
                </h5>
                <div className="error-message-margin">
                  <p className="error-message-font">
                    <span style={{ background: "yellow" }}>
                      Number of new samples detected 
                    </span>
                    : <span style={{ color: "red" }}>{ data.newSlots}</span>
                  </p>
                  <p className="error-message-font">
                    <span style={{ background: "yellow" }}>
                      Remaining slots in Freezer Box 
                    </span>
                    : 
                    <span style={{ color: "red" }}>
                      { data.results[0]["remaining slots"]}
                    </span>
                  </p>

                  <p className="error-extended-message">
                    The number of samples to be assigned exceeds the number of
                    available slots in the scanned box. Please double check the
                    scanned in box's inventory.
                  </p>
                </div>
              </>,
            );
          }
        }
      }
    } catch (error) {
      const typedError = error as { status: number; message: string };
      console.log(error);
      showError(
        <ErrorMessage
          process="Freezer Location Assignment"
          error={typedError}
        />,
      );
    }
  };

  // function for verifying tube location
  const verifyTubeLocation = async () => {
    updateTabInputs("vtTab", { actionButtonClicked: true });
    
    try {
      const params = new URLSearchParams({
        micronic_contents: JSON.stringify(tabInputs['vtTab'].locationMicronicCodes),
        barcode: tabInputs['vtTab'].barcode,
        sample_type: selectedPanel,
      });

      const response = await fetch(`/api/verify-tube-location?${params}`);

      if (response.ok) {
        const data = await response.json();

        if (!data.fbValid) {
          showError(
            <>
              <h5 style={{ marginBottom: "15px" }}>
                Freezer Box Barcode Not Found!
              </h5>
              <div className="error-message-margin">
                <p className="error-message-font">
                  Entered barcode:{" "}
                  <span style={{ backgroundColor: "yellow" }}>
                    {tabInputs['vtTab'].barcode}{" "}
                  </span>
                </p>
                <p>
                  Please double check the scanned barcode and make sure the
                  correct DNA type is selected. If this is a new box, please
                  make sure the box has been assigned a barcode.
                </p>
              </div>
            </>,
          );
        } else {
          updateTabInputs(tabNum, { returnedData: data.diffDf });
          evalDiffDf(data.diffDf);
        }
      } else {
        const error = await response.json();
        console.log(error);

        const errorObj = {
          status: response.status,
          message: error.detail[0]?.msg || error.detail,
        };

        throw errorObj;
      }
    } catch (error) {
      const typedError = error as { status: number; message: string };
      console.log(error);
      showError(
        <ErrorMessage
          process="Verify Tube Location"
          error={typedError}
        />,
      );
    }
  };

  // function for SSO verification -- send uploaded micronic file and .ttx file to backend
  // as input for KO bash script

  const [isLoading, setIsLoading] = useState(false);

  const processSSO = async () => {
    setIsLoading(true);
    updateTabInputs("ssoTab", { actionButtonClicked: true });

    try {
      const response = await fetch("/api/sso-verification", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          mcFileName: tabInputs["ssoTab"].mcFile,
          mcContent: tabInputs["ssoTab"].mcFileContent,
          ttxFileName: tabInputs["ssoTab"].ttxFile,
          ttxContent: tabInputs["ssoTab"].ttxFileContent,
        }),
      });

      if (response.ok) {
        const data = await response.json();
        updateTabInputs("ssoTab", { returnedData: data.compareRecords });
      } else {
        const error = await response.json();
        console.log(error);

        const errorObj = {
          status: response.status,
          message: error.detail[0]?.msg || error.detail,
        };

        throw errorObj;
      }
    } catch (error) {
      const typedError = error as { status: number; message: string };
      console.log(error);
      showError(<ErrorMessage process="Process SSO" error={typedError} />);
    } finally {
      setIsLoading(false);
    }
  };

  // function to write content from uploaded NGS sample sheet
  // to the ngs_run_info table
  const uploadNgsInfo = async () => {

    updateTabInputs(tabNum, {confirmClicked: true})
    try {
      const response = await fetch("/api/upload-ngs", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ sampleSheetContent: tabInputs["ngsTab"].sampleSheetContent }),
      });

      if (response.ok) {
        const data = await response.json();

        if (data.uploadedNumSamples === 24) {
          const sampleSheetArray = createDataArray(
            tabInputs["ngsTab"].sampleSheetContent,
            tabNum,
            24,
          ).slice(1);

          updateTabInputs(tabNum, {
            runNumber: 2122,
            showConfirm: false,
            sampleSheetArray: sampleSheetArray,
          });
        } else {
          showError(
            <>
              <h5 style={{ marginBottom: "15px" }}>
                Incorrect Number of Samples Uploaded!
              </h5>
              <p className="error-message-margin">
                <p className="error-message-font">
                  <span style={{ background: "yellow" }}>
                    Expected number of Samples
                  </span>
                  : <span style={{ color: "red" }}>{24}</span>
                </p>
                <p className="error-message-font">
                  <span style={{ background: "yellow" }}>
                    Number of Samples Uploaded
                  </span>
                  : <span style={{ color: "red" }}>
                    {data.uploadedNumSamples}
                  </span>
                </p>

                <p className="error-extended-message">
                  The number of samples in the uploaded sample sheet does not
                  contain the expected 24 samples for an NGS run. Please double
                  check the sample sheet.
                </p>
              </p>
            </>,
          );
        }
      }
    } catch (error) {
      console.log(error);
      const typedError = error as { status: number; message: string };

      showError(<ErrorMessage process="Upload NGS Info" error={typedError} />);
    }
  };

  // function for checking NGS Tray Setup
  const checkNGSTray = async () => {
    updateTabInputs("ngsTab", { actionButtonClicked: true });

    try {
      const params = new URLSearchParams({
        micronic_contents: JSON.stringify(tabInputs["ngsTab"].locationMicronicCodes),
        sample_sheet_contents: JSON.stringify(tabInputs["ngsTab"].sampleSheetArray),
        run_number: tabInputs["ngsTab"].runNumber,
      });

      const response = await fetch(`/api/check-ngs-tray?${params}`);

      if (response.ok) {
        const data = await response.json();
        updateTabInputs(tabNum, { returnedData: data.diffDf });
        evalDiffDf(data.diffDf);
      } else {
        const error = await response.json();
        console.log(error);

        const errorObj = {
          status: response.status,
          message: error.detail[0]?.msg || error.detail,
        };

        throw errorObj;
      }
    } catch (error) {
      console.log(error);
      const typedError = error as { status: number; message: string };

      showError(<ErrorMessage process="Check NGS Tray" error={typedError} />);
    }
  };

  // display mismatch UI
  const evalDiffDf = (results: {'row number': number, 'location': string, 'database entry': string, 'micronic file entry': string, 'match': string}[]) => {

    const diffs = results.filter((obj) => obj.match === "FALSE");

    if (diffs.length !== 0) {
      showError(
        <>
          <h5 style={{ marginBottom: "15px" }}>Mismatches Detected!</h5>
          <CreateTable data={diffs} checkTable={true} />
        </>,
      );
    }
  };

  const runButtonDetails = {
    flTab: {
      label: "Assign Freezer Location!",
      func: () => assignFreezerLocation(),
    },
    vtTab: { label: "Verify Tube Location!", func: () => verifyTubeLocation() },
    ssoTab: { label: "Process SSO!", func: () => processSSO() },
    ngsTab: {
      label: "Check NGS Tray!",
      func: () => {
        checkNGSTray();
      },
    },
  };

  if (tabNum === "ngsTab") {
    return (
      <>
        <div className="sample-location-checklist-wrapper">
          <div className="vt-checklist-wrapper">
            <div className="input-label-wrapper">
              <input
                type="checkbox"
                id="step1"
                name="step1"
                checked={firstCheckboxBool}
                disabled={firstCheckboxBool}
                readOnly
              />
              <label>Upload NGS Sample Sheet</label>
            </div>
            <div className="file-input-wrapper">
              <FileUploader
                onUpload={handleChecklistUpdates}
                id={"sample-uploader"}
                action="upload"
                uploadType="csv"
                tabNum={tabNum}
                fileRef={sampleFileRef}
              />
              <VisibleFileUploader
                fileName={tabInputs[tabNum].sampleSheet}
                id={"sample-uploader"}
                style="sc"
                disabled={tabInputs[tabNum].runNumber !== ""}
              />
            </div>
          </div>

          {tabInputs[tabNum].sampleCheckbox &&
            tabInputs[tabNum].showConfirm && (
              <div className="input-button-wrapper fl-assignment">
                <InputButton
                  label="Confirm Sample Sheet!"
                  style="enter-button"
                  handleClick={() => uploadNgsInfo()}
                  disabled={tabInputs[tabNum].confirmClicked}
                />
                <InputButton
                  label="Reset"
                  style="reset-button"
                  handleClick={() => resetButton(tabNum)}
                />
              </div>
            )}

          {tabInputs[tabNum].runNumber !== "" && (
            <div className="vt-checklist-wrapper">
              <div className="input-label-wrapper">
                <input
                  type="checkbox"
                  id={"ngs-micronic"}
                  name={"ngs-micronic"}
                  checked={tabInputs[tabNum].mcCheckbox}
                  disabled={tabInputs[tabNum].mcCheckbox}
                  readOnly
                />
                <label>Upload Micronic Output File</label>
              </div>
              <MicronicUploadUI
                tabInfo={tabInputs[tabNum]}
                tab={tabNum}
                handleUpdates={handleChecklistUpdates}
                micronicRef={micronicFileRef}
              />
            </div>
          )}

          {tabInputs[tabNum].mcCheckbox && (
            <NumberSamplesUI
              numBool={numSamplesBool}
              tabInfo={tabInputs[tabNum]}
              tab={tabNum}
              handleClick={handleEnter}
            />
          )}

          {numSamplesBool && tabInputs[tabNum].showValidate && (
            <div className="input-button-wrapper fl-assignment">
              <InputButton
                label="Validate Micronic Code File"
                style="enter-button"
                handleClick={() => validateMicronicFile()}
                disabled={tabInputs[tabNum].validateClicked}
              />
              <InputButton
                label="Reset"
                style="reset-button"
                handleClick={() => resetButton(tabNum)}
              />
            </div>
          )}

          {tabInputs[tabNum].locationMicronicCodes && (
            <div className="input-button-wrapper fl-assignment">
              <InputButton
                label={runButtonDetails[tabNum].label}
                style="assign-fl-button"
                handleClick={runButtonDetails[tabNum].func}
                disabled={tabInputs[tabNum].actionButtonClicked}
              />
              <InputButton
                label="Reset"
                style="reset-button"
                handleClick={() => resetButton(tabNum)}
              />
            </div>
          )}
        </div>
        {show && <ErrorModal message={message} onClose={hideError} />}
      </>
    );
  }

  return (
    <>
      <div className="sample-location-checklist-wrapper">
        <div className="vt-checklist-wrapper">
          <div className="input-label-wrapper">
            <input
              type="checkbox"
              id="step1"
              name="step1"
              checked={firstCheckboxBool}
              disabled={firstCheckboxBool}
              readOnly
            />
            <label>Upload Micronic Output File</label>
          </div>

          <MicronicUploadUI
            tabInfo={tabInputs[tabNum]}
            tab={tabNum}
            handleUpdates={handleChecklistUpdates}
            micronicRef={micronicFileRef}
          />
        </div>

        {/* NUMBER OF SAMPLES */}
        {/*if verify tube location is selected on gDNA, require first checkbox to be checked
        and show confirm button to not be present in order to enable number of samples UI
        else, only require first checkbox to be checked
        */}
        {tabInputs[tabNum].mcCheckbox && (
          <NumberSamplesUI
            numBool={numSamplesBool}
            tabInfo={tabInputs[tabNum]}
            tab={tabNum}
            handleClick={handleEnter}
          />
        )}

        {numSamplesBool && tabInputs[tabNum].showValidate && (
          <div className="input-button-wrapper fl-assignment">
            <InputButton
              label="Validate Micronic Code File"
              style="enter-button"
              handleClick={() => validateMicronicFile()}
              disabled={tabInputs[tabNum].validateClicked}
            />
            <InputButton
              label="Reset"
              style="reset-button"
              handleClick={() => resetButton(tabNum)}
            />
          </div>
        )}

        {/* SCAN FREEZER BOX BARCODE
        -- VERIFY TUBE LOCATION --
        CHI
        -immediately enable after micronic file output
        GDNA
        -QUESTIONABLE --- NEED TO REVISE THIS
        -enable immediately if verify type is "Sample Location"
        -if SSO, enable after micronic output file is updated

        -- FREEZER LOCATION ASSIGNMENT --
        BOTH
        -enable after micronic code validation
        */}
        {tabInputs[tabNum].mcCheckbox &&
          numSamplesBool &&
          tabInputs[tabNum].extractionNumbersMicronicCodes !== null && (
            <div className="vt-checklist-wrapper">
              {tabNum !== "ssoTab" ? (
                <>
                  <div className="input-label-wrapper">
                    <input
                      type="checkbox"
                      id="scan-barcode"
                      name="scan-barcode"
                      checked={isScanned}
                      readOnly
                    />
                    <label htmlFor="sc-barcode">
                      {" "}
                      Scan Freezer Box Barcode
                    </label>
                  </div>
                  <TextInputTabs
                    label="sc-barcode"
                    title=""
                    value={tabInputs[tabNum].barcode}
                    style="sc-barcode-style"
                    handleChange={(e) => handleChecklistUpdates(e, tabNum)}
                    disabled={tabInputs[tabNum].actionButtonClicked}
                  />{" "}
                </>
              ) : (
                <>
                  <div className="input-label-wrapper">
                    <input
                      type="checkbox"
                      id="ttx-checkbox"
                      name="ttx-checkbox"
                      checked={tabInputs[tabNum].ttxFile !== "No file chosen"}
                      readOnly
                    />
                    <label>
                      Upload <b>.ttx</b> File
                    </label>
                  </div>
                  <div className="file-input-wrapper">
                    <FileUploader
                      onUpload={handleChecklistUpdates}
                      id={"ttx-uploader"}
                      action="upload"
                      uploadType="ttx"
                      tabNum={tabNum}
                      fileRef={ttxFileRef}
                    />
                    <VisibleFileUploader
                      fileName={tabInputs[tabNum].ttxFile}
                      id={"ttx-uploader"}
                      style="sc"
                    />
                  </div>
                </>
              )}
            </div>
          )}

        {(isScanned || (tabNum === 'ssoTab' && tabInputs[tabNum].ttxCheckbox)) && (
          <div className="input-button-wrapper fl-assignment">
            <InputButton
              label={runButtonDetails[tabNum].label}
              style="assign-fl-button"
              handleClick={runButtonDetails[tabNum].func}
              disabled={tabInputs[tabNum].actionButtonClicked}
            />
            <InputButton
              label="Reset"
              style="reset-button"
              handleClick={() => resetButton(tabNum)}
            />
          </div>
        )}

        {/* SPINNNER ! */}
        {isLoading && (
          <div className="modal-overlay">{<Bars color="#ee3a43" />}</div>
        )}

        {show && <ErrorModal message={message} onClose={hideError} />}
      </div>
    </>
  );
}

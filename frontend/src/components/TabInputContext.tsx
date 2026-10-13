import { createContext, useContext, useState, useRef } from "react";

import {
  TabContextTypes,
  TabInputContextProps,
  TabInputsTypes,
  TabStateTypes,
} from "./types";

const TabInputContext = createContext<TabInputContextProps | null>(null);

const initialTabState: TabInputsTypes = {
  //micronic code assignment tab
  mcTab: {
    mcFile: "No file chosen",
    numSamples: "",
    tableData: "",
    mcFileContent: "",
    linkClicked: false,
  },
  //freezer location assignment tab
  flTab: {
    mcCheckbox: false,
    barcode: "",
    mcFile: "No file chosen",
    mcFileContent: "",
    numSamples: "",
    extractionNumbersMicronicCodes: null,
    showValidate: true,
    micronicCodes: "",
    validateClicked: false,
    actionButtonClicked: false,
    returnedData: null,
  },
  //verify tube location tab
  vtTab: {
    mcCheckbox: false,
    barcode: "",
    mcFile: "No file chosen",
    mcFileContent: "",
    thirdCheckBox: false,
    numSamples: "",
    extractionNumbersMicronicCodes: null,
    locationMicronicCodes: null,
    showValidate: true,
    validateClicked: false,
    micronicCodes: "",
    actionButtonClicked: false,
    returnedData: null,
  },
  //freezer box barcode assignment tab
  fbTab: {
    barcode: "",
    allBoxes: null,
    lastBox: "",
    assignClicked: false,
  },
  ssoTab : {
    mcCheckbox: false,
    barcode: "",
    mcFile: "No file chosen",
    mcFileContent: "",
    verifyType: "None selected",
    thirdCheckBox: false,
    numSamples: "",
    extractionNumbersMicronicCodes: null,
    locationMicronicCodes: null,
    showValidate: true,
    validateClicked: false,
    micronicCodes: "",
    actionButtonClicked: false,
    returnedData: null,
    ttxFile: "No file chosen",
    ttxFileContent: "",
    ttxCheckbox: false,
  }, 
  ngsTab: {
    mcCheckbox: false,
    mcFile: "No file chosen",
    mcFileContent: "",
    showConfirm: true,
    confirmClicked: false,
    numSamples: "",
    locationMicronicCodes: null,
    showValidate: true,
    validateClicked: false,
    micronicCodes: "",
    actionButtonClicked: false,
    returnedData: null,
    sampleCheckbox: false,
    sampleSheet: "No file chosen",
    sampleSheetContent: "",
    sampleSheetArray: "",
    runNumber: ""
  }, 
  queryDBTab: {
    returnedData: null,
    selected: "None selected",
    inputValue: "",
    enterClicked: false
  }
};

export function TabInputProvider({ children, selectedPanel }: TabContextTypes) {
  const [tabInputs, setTabInputs] = useState<TabInputsTypes>(initialTabState);

  const updateTabInputs = (
    tabName: keyof TabInputsTypes,
    updatedInputs: Record<string, unknown>,
  ) => {
    setTabInputs((prev) => ({
      ...prev,
      [tabName]: {
        ...prev[tabName],
        ...updatedInputs,
      },
    }));
  };

  //store entered information into dictionary
  const handleEnter = (
    eOrval: React.ChangeEvent<HTMLInputElement>,
    tab: TabStateTypes,
    field: string,
  ) => {
    // determine if eOrVal is an event or a value to update
    // can't remember why i added this... we'll found out once i'm finished
    // converting to TS
    const value = eOrval.target.value;

    //typeof eOrval.preventDefault === "function"
    //  ? eOrval.target.value
    //  : eOrval;

    setTabInputs((prev) => ({
      ...prev,
      [tab]: {
        ...prev[tab],
        [field]: value.replace(/\D/g, ""),
      },
    }));
  };

  // reset button logic
  const resetTabState = (tab: TabStateTypes) => {
    setTabInputs((prev) => ({
      ...prev,
      [tab]: initialTabState[tab],
    }));
  };

  const resetFileState = (tab: TabStateTypes) => {
    const input = micronicFileRef.current[tab];

    if (input) {
      input.value = "";
    }
  };

  const resetButton = (tab: TabStateTypes, resetAll = false) => {
    if (resetAll) {
      resetFileState(tab);
    }
    resetTabState(tab);
  };

  const readFileContent = (file: Blob, callback: (result: string) => void) => {
    const reader = new FileReader();

    reader.onload = (event) => {
      callback(event.target!.result as string);
    };

    reader.readAsText(file);
  };

  // tracks where the micronic output file reader has been loaded, and which
  // component it is currently active in
  // if not active, the object will be null. otherwise, it will me the mc output file reader input element
  const micronicFileRef = useRef<Record<string, HTMLInputElement | null>>({});
  // .ttx file ref
  const ttxFileRef = useRef<Record<string, HTMLInputElement | null>>({});
  // sample sheet file ref - NGS
  const sampleFileRef = useRef<Record<string, HTMLInputElement | null>>({});

  return (
    <TabInputContext.Provider
      value={{
        tabInputs,
        updateTabInputs,
        resetButton,
        selectedPanel,
        readFileContent,
        handleEnter,
        micronicFileRef,
        ttxFileRef,
        sampleFileRef
      }}
    >
      {children}
    </TabInputContext.Provider>
  );
}

// eslint-disable-next-line react-refresh/only-export-components
export function useTabData() {
  return useContext(TabInputContext);
}

import { ReactNode } from "react";

export type TableDataContentTypes = {
  "extraction number": string;
  location: string;
  "micronic code": string;
  //X or check symbol
  linked?: React.ReactNode;
}[];

export type TabInputsTypes = {
  mcTab: {
    mcFile: string;
    numSamples: string;
    tableData: TableDataContentTypes | "";
    //raw content
    mcFileContent: string;
    linkClicked: boolean;
  };
  flTab: {
    mcCheckbox: boolean;
    barcode: string;
    mcFile: string;
    mcFileContent: string;
    numSamples: string;
    extractionNumbersMicronicCodes: null | {
      "extraction number": number;
      "micronic code": string;
    }[];
    showValidate: boolean;
    validateClicked: boolean;
    micronicCodes: string;
    actionButtonClicked: boolean;
    returnedData: null | {
      "extraction number": number;
      "micronic code": string;
      "location":string;
    }[];
  };
  vtTab: {
    mcCheckbox: boolean;
    barcode: string;
    mcFile: string;
    mcFileContent: string;
    thirdCheckBox: boolean;
    numSamples: string;
    extractionNumbersMicronicCodes: null | {
      "extraction number": number;
      "micronic code": string;
    }[];
    locationMicronicCodes:null | {
      "location": string;
      "micronic code": string;
    }[];
    showValidate: boolean;
    validateClicked:  boolean;
    micronicCodes: string;
    actionButtonClicked: boolean;
    returnedData: null;
  };
  ssoTab: {
    mcCheckbox: boolean;
    barcode: string;
    mcFile: string;
    mcFileContent: string;
    verifyType: string;
    thirdCheckBox: boolean;
    numSamples: string;
    extractionNumbersMicronicCodes: null | {
      "extraction number": number;
      "micronic code": string;
    }[];
    locationMicronicCodes:null | {
      "location": string;
      "micronic code": string;
    }[];
    showValidate: boolean;
    validateClicked: boolean;
    micronicCodes: string;
    actionButtonClicked: boolean;
    returnedData: null;
    ttxFile: string;
    ttxFileContent: string;
    ttxCheckbox: boolean;
  };
  ngsTab: {
    mcCheckbox: boolean;
    mcFile: string;
    mcFileContent: string;
    numSamples: string;
    locationMicronicCodes:null | {
      "location": string;
      "micronic code": string;
    }[];
    showValidate: boolean;
    validateClicked: false;
    showConfirm: boolean;
    confirmClicked: boolean;
    micronicCodes: string;
    actionButtonClicked: boolean;
    returnedData: null;
    sampleCheckbox: boolean;
    sampleSheet: string;
    sampleSheetContent: string;
    sampleSheetArray: string;
    runNumber: string;
  };
  fbTab: {
    barcode: string;
    allBoxes: null | {
      previousBox: [string, string];
      currentBox: [string, string];
      futureBox: string;
    };
    lastBox: string;
    assignClicked: boolean;
  };
  queryDBTab: {
    returnedData: null;
    selected: QueryTitle;
    inputValue: string;
    enterClicked: boolean;
  }
};

export type ResetButtonProps = {
  tab: TabStateTypes;
  resetAll?: boolean;
};

// tab input context types
export type TabInputContextProps = {
  tabInputs: TabInputsTypes;
  updateTabInputs: (
    tabName: keyof TabInputsTypes,
    updatedInputs: Record<string, unknown>,
  ) => void;
  resetButton: (tab: TabStateTypes, resetAll?: boolean) => void;
  selectedPanel: SidePanelTypes;
  readFileContent: (file: Blob, callback: (result: string) => void) => void;
  handleEnter: (
    eOrval: React.ChangeEvent<HTMLInputElement>,
    tab: TabStateTypes,
    field: string,
  ) => void;
  micronicFileRef: React.RefObject<Record<string, HTMLInputElement | null>>;
  ttxFileRef: React.RefObject<Record<string, HTMLInputElement | null>>;
  sampleFileRef: React.RefObject<Record<string, HTMLInputElement | null>>;
};

//tab input provider types

export type TabContextTypes = {
  children: ReactNode;
  selectedPanel: SidePanelTypes;
};

export type TabStateTypes = "mcTab" | "flTab" | "vtTab" | "fbTab" | "ssoTab" | "ngsTab" | "queryDBTab";

// tabset and side panel types

export type SidePanelTypes = "Chimerism" | "Genomic DNA";

export type TabTypes =
  | "Assign MC"
  | "Assign Location"
  | "Verify Location"
  | "Assign Box BC"
  | "Query DB"
  | "NGS"
  | "SSO";

export type SidePanelProps = {
  activeSidePanel: SidePanelTypes;
  handleSidePanelChange: (panel: SidePanelTypes) => void;
};

export type TabsetProps = {
  activeTab: TabTypes;
  setActiveTab: (tab: TabTypes) => void;
  panel: SidePanelTypes;
};

//error component types

export type ErrorModalProps = {
  message: string | React.ReactNode;
  onClose: () => void;
};

export type ErrorDetailsProps = {
  errorType: string;
  content: React.ReactNode;
};

export type ErrorMessageProps = {
  process:
    | "Micronic Linking"
    | "Freezer Box Barcode Assignment"
    | "Freezer Location Assignment"
    | "Query Database"
    | "Verify Tube Location"
    | "Upload NGS Info"
    | "Check NGS Tray"
    | "Process SSO";
  error: {
    status: number;
    message: string;
  };
};


//input types
export type TextInputTabsProps = {
  label: string;
  title: string;
  value: number | string | undefined;
  handleChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  style?: string;
  textboxStyle?: string;
  heading?: boolean;
  disabled?: boolean;
};

export type SampleNumberInputProps = Omit<
  TextInputTabsProps,
  "label" | "handleChange"
> & {
  tabNum: "flTab" | "vtTab" | "ngsTab" | "ssoTab" | "mcTab";
  handleEnter: (
    eOrval: React.ChangeEvent<HTMLInputElement>,
    tab: TabStateTypes,
    field: string,
  ) => void;
};

export type QueryTitle =
  | "None selected"
  | "Extraction #"
  | "Box Barcode #"
  | "Sample #";

export type TextInputQueryProps = {
  label: string;
  title: string;
  value: string;
  updateInputs: (e: React.ChangeEvent<HTMLInputElement>) => void;
  disabled: boolean;
};

export type VisibleFileUploaderProps = {
  fileName: string;
  style: string;
  disabled?: boolean;
  id: string;
};

export type FileUploaderProps = {
  onUpload: (e: React.ChangeEvent<HTMLInputElement>, tabNum: keyof TabInputsTypes, action: string, uploadType: string) => void;
  id: string;
  action: string;
  uploadType: "micronic" | "ttx" | "csv";
  tabNum: keyof TabInputsTypes;
  fileRef: React.RefObject<Record<string, HTMLInputElement | null>>;
  disabled?: boolean;
};

export type InputButtonProps = {
  label: string;
  style: string;
  handleClick?: (e: React.MouseEvent<HTMLButtonElement> | null) => void;
  disabled?: boolean;
};

//sample checklist types

//only these tabs use the sample checklist component
export type SampleChecklistTabs = {
  tabNum: "flTab" | "vtTab" | "ssoTab" | "ngsTab";
};

//create table types

//some created tables are only for display, so handleChange
//is optional
export type CreateTableProps = {
  data: Record<string, unknown>[] | "";
  handleChange?: (newData: TableDataContentTypes) => void;
  micronicCodeTable?: boolean;
  editableColumns?: string[];
  checkTable?: boolean;
};

export type MicronicUploadUIProps = {
  tabInfo: TabInputsTypes["flTab" | "vtTab" | "ngsTab" | "ssoTab"];
  tab: TabStateTypes;
  handleUpdates: (
    e: React.ChangeEvent<HTMLInputElement>,
    tabNum: TabStateTypes,
    uploadType: string,
    action: string
  ) => void;
  micronicRef: React.RefObject<Record<string, HTMLInputElement | null>>;
}

export type NumberSamplesUIProps = {
  numBool: boolean;
  tabInfo: TabInputsTypes["flTab" | "vtTab" | "ngsTab" | "ssoTab"];
  tab: "flTab" | "vtTab" | "ngsTab" | "ssoTab";
  handleClick: (
    eOrval: React.ChangeEvent<HTMLInputElement>,
    tab: TabStateTypes,
    field: string,
  ) => void;
}
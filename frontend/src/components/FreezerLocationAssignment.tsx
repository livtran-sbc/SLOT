import SampleChecklist from "./SampleChecklist";
import { CreateTable } from "./CreateTable";
import { useTabData } from "./TabInputContext";

export default function FreezerLocationAssignment() {
  const { tabInputs } = useTabData()!;
  const tab = tabInputs["flTab"];

  return (
    <>
      <div className="header-wrapper">
        <h4 id="tab-specific-wrapper">
          Sample Location Assignment Checklist
        </h4>
        <SampleChecklist tabNum="flTab" />
      </div>
      {tab.returnedData && <div className="divider"></div>}
      <div className="summary-section-style">
        {
          // return assignment summary
          tab.returnedData && (
            <>
              <h3 style={{margin: '20px 0px'}}>Sample Location Assignment Summary</h3>
              <CreateTable data={tab.returnedData} />
            </>
          )
        }
      </div>
    </>
  );
}

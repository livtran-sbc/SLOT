import { useState } from "react";

import { TabInputProvider } from "./TabInputContext";

import SidePanel from "./SidePanel";
import Tabset from "./Tabset";

import { SidePanelTypes, TabTypes } from "./types";

export default function BasePage() {
  const [activeSidePanel, setActiveSidePanel] =
    useState<SidePanelTypes>("Chimerism");
  const [activeTab, setActiveTab] = useState<TabTypes>("Assign MC");


  // set default tab to first tab, MC Assignment
  const handleSidePanelChange = (panel: SidePanelTypes) => {
    setActiveSidePanel(panel);
    setActiveTab("Assign MC");
  };

  return (
    <div className="base-container">
      <SidePanel
        activeSidePanel={activeSidePanel}
        handleSidePanelChange={handleSidePanelChange}
      />

      <TabInputProvider key={activeSidePanel} selectedPanel={activeSidePanel}>
        {(activeSidePanel === "Chimerism" ||
          activeSidePanel === "Genomic DNA") && (
          <Tabset activeTab={activeTab} setActiveTab={setActiveTab} panel={activeSidePanel}/>
        )}
      </TabInputProvider>

    </div>
  );
}

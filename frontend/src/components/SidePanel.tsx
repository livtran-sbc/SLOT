import { Dna } from 'lucide-react';
import { SidePanelProps, SidePanelTypes } from './types';

const sidebarButtons: SidePanelTypes[] = ['Chimerism', 'Genomic DNA'];

export default function SidePanel ({ activeSidePanel, handleSidePanelChange } : SidePanelProps) {

    return (
        <div className="sidebar">
            <nav>
                <div className="title">
                    <div className="header-font">SLOT</div>
                    <img src='src/assets/BC_heart_mark.png' id='logo' className="m-2"/>
                </div>
                
                {sidebarButtons.map((btn, idx) => (
                    <div key={idx} className="side-panel-button-wrapper">
                        <button className = {`sidebar-buttons ${activeSidePanel === btn ? "active" : ""}`}
                        onClick={() => handleSidePanelChange(btn)}>
                        {activeSidePanel === btn ? <Dna className='dna-icon' size={40}/> : ""}
                            <span className='button-text'>{btn}</span>
                        </button>
                    </div>
                ))}
            </nav>
        </div>
    )
}
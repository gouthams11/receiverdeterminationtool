// Global variables
let devConditions = [];
let prodConditions = [];
let allResults = [];
let currentFilter = 'all';

// Utility functions
function showLoading() {
    document.getElementById('loadingSpinner').style.display = 'flex';
}

function hideLoading() {
    document.getElementById('loadingSpinner').style.display = 'none';
}

function updateInputInfo(textareaId, infoId) {
    const textarea = document.getElementById(textareaId);
    const info = document.getElementById(infoId);
    
    if (textarea.value.trim()) {
        const lineCount = textarea.value.split('\n').length;
        const charCount = textarea.value.length;
        info.textContent = `${lineCount} lines, ${charCount} characters`;
        info.style.color = '#28a745';
    } else {
        info.textContent = 'No XML loaded';
        info.style.color = '#666';
    }
}

function clearInput(textareaId) {
    document.getElementById(textareaId).value = '';
    const infoId = textareaId === 'devXML' ? 'devInfo' : 'prodInfo';
    updateInputInfo(textareaId, infoId);
}

function parseXML(xmlString) {
    try {
        const parser = new DOMParser();
        const xml = parser.parseFromString(xmlString, "text/xml");
        
        // Check for parsing errors
        const parseError = xml.getElementsByTagName("parsererror");
        if (parseError.length > 0) {
            throw new Error("Invalid XML format");
        }
        
        return xml;
    } catch (error) {
        throw new Error(`XML parsing failed: ${error.message}`);
    }
}

function extractConditions(xml) {
    const conditions = [];
    const receiverRules = xml.getElementsByTagName("ReceiverRule");

    for (let rule of receiverRules) {
        const component = rule.getElementsByTagName("ComponentID")[0]?.textContent || "Unknown";
        let conditionStrings = [];

        const conditionBlocks = rule.getElementsByTagName("AtomicConditionBlock");
        for (let block of conditionBlocks) {
            let blockConditions = [];

            const atomicConditions = block.getElementsByTagName("AtomicCondition");
            for (let cond of atomicConditions) {
                const left = cond.getElementsByTagName("LeftExtractor")[0]?.getElementsByTagName("Value")[0]?.textContent;
                const operator = cond.getElementsByTagName("Operator")[0]?.textContent;
                const right = cond.getElementsByTagName("RightExtractor")[0]?.getElementsByTagName("Value")[0]?.textContent;

                if (left && operator) {
                    let formattedOperator = operator === 'EQ' ? '=' : operator === 'NE' ? '≠' : operator === 'LIKE' ? '≈' : operator;
                    let formattedCondition = `${left} ${formattedOperator} ${right || 'NULL'}`;
                    blockConditions.push(formattedCondition);
                }
            }

            if (blockConditions.length) {
                conditionStrings.push(blockConditions.join(" AND "));
            }
        }

        // Extract additional metadata
        const description = rule.getElementsByTagName("Description")[0]?.textContent || "";
        const isActive = rule.getAttribute("active") !== "false";

        conditions.push({ 
            component, 
            condition: conditionStrings.length ? conditionStrings.join(" OR ") : "No conditions",
            description,
            isActive
        });
    }
    return conditions;
}

function compareXML() {
    const devXMLString = document.getElementById("devXML").value.trim();
    const prodXMLString = document.getElementById("prodXML").value.trim();

    if (!devXMLString || !prodXMLString) {
        alert("⚠️ Please paste both Development and Production XML contents.");
        return;
    }

    showLoading();

    try {
        setTimeout(() => {
            const devXML = parseXML(devXMLString);
            const prodXML = parseXML(prodXMLString);

            devConditions = extractConditions(devXML);
            prodConditions = extractConditions(prodXML);

            displayComparison(devConditions, prodConditions);
            hideLoading();
        }, 500);
        
    } catch (error) {
        hideLoading();
        alert(`❌ Error processing XML: ${error.message}`);
    }
}

function displayComparison(devConditions, prodConditions) {
    const components = new Set([
        ...devConditions.map(dc => dc.component), 
        ...prodConditions.map(pc => pc.component)
    ]);

    allResults = [];
    let differenceCount = 0;

    components.forEach(component => {
        const devCondition = devConditions.find(dc => dc.component === component);
        const prodCondition = prodConditions.find(pc => pc.component === component);
        
        const devText = devCondition?.condition || "-";
        const prodText = prodCondition?.condition || "-";
        
        let status = 'matching';
        if (devText === "-" || prodText === "-") {
            status = 'missing';
            differenceCount++;
        } else if (devText !== prodText) {
            status = 'different';
            differenceCount++;
        }

        allResults.push({
            component,
            devCondition: devText,
            prodCondition: prodText,
            devDescription: devCondition?.description || "",
            prodDescription: prodCondition?.description || "",
            status
        });
    });

    updateStats(allResults.length, differenceCount);
    renderResults(allResults);
    
    // Show filter and results sections
    document.getElementById('filterSection').style.display = 'block';
    document.getElementById('resultsSection').style.display = 'block';
    document.getElementById('exportBtn').disabled = differenceCount === 0;
}

function renderResults(results) {
    let output = `
        <div class="table-container">
            <table id="comparisonTable">
                <thead>
                    <tr>
                        <th>Component ID</th>
                        <th>Development Condition</th>
                        <th>Production Condition</th>
                        <th>Status</th>
                    </tr>
                </thead>
                <tbody>
    `;

    results.forEach(result => {
        const rowClass = `row-${result.status}`;
        const statusIcon = getStatusIcon(result.status);
        
        output += `
            <tr class="${rowClass}">
                <td>
                    <strong>${result.component}</strong>
                    ${result.devDescription ? `<br><small style="opacity: 0.7;">${result.devDescription}</small>` : ''}
                </td>
                <td>
                    <div class="condition-text">${formatCondition(result.devCondition)}</div>
                </td>
                <td>
                    <div class="condition-text">${formatCondition(result.prodCondition)}</div>
                </td>
                <td>
                    <span class="status-badge status-${result.status}">
                        ${statusIcon} ${result.status.toUpperCase()}
                    </span>
                </td>
            </tr>
        `;
    });

    output += `
                </tbody>
            </table>
        </div>
    `;

    document.getElementById("output").innerHTML = output;
}

function formatCondition(condition) {
    if (condition === "-") {
        return '<em style="color: #999;">Not configured</em>';
    }
    
    // Add syntax highlighting for conditions
    return condition
        .replace(/=/g, '<span style="color: #0066cc; font-weight: bold;">=</span>')
        .replace(/≠/g, '<span style="color: #cc0066; font-weight: bold;">≠</span>')
        .replace(/≈/g, '<span style="color: #cc6600; font-weight: bold;">≈</span>')
        .replace(/AND/g, '<span style="color: #006600; font-weight: bold;">AND</span>')
        .replace(/OR/g, '<span style="color: #cc6600; font-weight: bold;">OR</span>');
}

function getStatusIcon(status) {
    switch (status) {
        case 'different': return '⚠️';
        case 'missing': return '❌';
        case 'matching': return '✅';
        default: return '❓';
    }
}

function updateStats(total, differences) {
    document.getElementById('totalConditions').textContent = total;
    document.getElementById('differences').textContent = differences;
}

function filterResults() {
    const searchTerm = document.getElementById('searchFilter').value.toLowerCase();
    const viewFilter = document.getElementById('viewFilter').value;
    
    let filteredResults = allResults;
    
    // Apply view filter
    if (viewFilter === 'differences') {
        filteredResults = allResults.filter(r => r.status !== 'matching');
    } else if (viewFilter === 'matching') {
        filteredResults = allResults.filter(r => r.status === 'matching');
    }
    
    // Apply search filter
    if (searchTerm) {
        filteredResults = filteredResults.filter(r => 
            r.component.toLowerCase().includes(searchTerm) ||
            r.devCondition.toLowerCase().includes(searchTerm) ||
            r.prodCondition.toLowerCase().includes(searchTerm)
        );
    }
    
    renderResults(filteredResults);
}

function exportHighlightedRowsToExcel() {
    const differenceRows = allResults.filter(r => r.status !== 'matching');
    
    if (differenceRows.length === 0) {
        alert("❌ No differences found to export.");
        return;
    }

    const exportData = [
        ["Component ID", "Development Condition", "Production Condition", "Status", "Timestamp"]
    ];
    
    differenceRows.forEach(row => {
        exportData.push([
            row.component,
            row.devCondition === "-" ? "Not configured" : row.devCondition,
            row.prodCondition === "-" ? "Not configured" : row.prodCondition,
            row.status.toUpperCase(),
            new Date().toISOString()
        ]);
    });

    const ws = XLSX.utils.aoa_to_sheet(exportData);
    
    // Set column widths
    ws['!cols'] = [
        { wch: 30 }, // Component
        { wch: 50 }, // Dev Condition
        { wch: 50 }, // Prod Condition
        { wch: 15 }, // Status
        { wch: 25 }  // Timestamp
    ];

    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Differences");
    
    const filename = `SAP_PIPO_Differences_${new Date().toISOString().slice(0, 10)}.xlsx`;
    XLSX.writeFile(wb, filename);
}

function exportFullReport() {
    if (allResults.length === 0) {
        alert("❌ No data to export. Please run a comparison first.");
        return;
    }

    const exportData = [
        ["Component ID", "Development Condition", "Production Condition", "Status", "Dev Description", "Prod Description", "Timestamp"]
    ];
    
    allResults.forEach(row => {
        exportData.push([
            row.component,
            row.devCondition === "-" ? "Not configured" : row.devCondition,
            row.prodCondition === "-" ? "Not configured" : row.prodCondition,
            row.status.toUpperCase(),
            row.devDescription || "",
            row.prodDescription || "",
            new Date().toISOString()
        ]);
    });

    const ws = XLSX.utils.aoa_to_sheet(exportData);
    
    // Set column widths
    ws['!cols'] = [
        { wch: 30 }, // Component
        { wch: 50 }, // Dev Condition
        { wch: 50 }, // Prod Condition
        { wch: 15 }, // Status
        { wch: 30 }, // Dev Description
        { wch: 30 }, // Prod Description
        { wch: 25 }  // Timestamp
    ];

    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Full Report");
    
    const filename = `SAP_PIPO_Full_Report_${new Date().toISOString().slice(0, 10)}.xlsx`;
    XLSX.writeFile(wb, filename);
}

function showXMLPreview() {
    const devXML = document.getElementById("devXML").value;
    const prodXML = document.getElementById("prodXML").value;
    
    if (!devXML && !prodXML) {
        alert("❌ No XML content to preview.");
        return;
    }
    
    document.getElementById('devXMLPreview').textContent = devXML || "No development XML loaded";
    document.getElementById('prodXMLPreview').textContent = prodXML || "No production XML loaded";
    document.getElementById('xmlModal').style.display = 'block';
    
    // Syntax highlighting
    if (window.Prism) {
        Prism.highlightElement(document.getElementById('devXMLPreview'));
        Prism.highlightElement(document.getElementById('prodXMLPreview'));
    }
}

function closeModal() {
    document.getElementById('xmlModal').style.display = 'none';
}

function showTab(tabName) {
    // Hide all tabs
    document.querySelectorAll('.tab-pane').forEach(pane => {
        pane.classList.remove('active');
    });
    document.querySelectorAll('.tab').forEach(tab => {
        tab.classList.remove('active');
    });
    
    // Show selected tab
    document.getElementById(tabName + 'Tab').classList.add('active');
    event.target.classList.add('active');
}

// Event listeners
document.addEventListener('DOMContentLoaded', function() {
    // Add input event listeners for real-time info updates
    document.getElementById('devXML').addEventListener('input', () => updateInputInfo('devXML', 'devInfo'));
    document.getElementById('prodXML').addEventListener('input', () => updateInputInfo('prodXML', 'prodInfo'));
    
    // Close modal when clicking outside
    window.addEventListener('click', function(event) {
        const modal = document.getElementById('xmlModal');
        if (event.target === modal) {
            closeModal();
        }
    });
    
    // Keyboard shortcuts
    document.addEventListener('keydown', function(event) {
        if (event.ctrlKey || event.metaKey) {
            switch(event.key) {
                case 'Enter':
                    event.preventDefault();
                    compareXML();
                    break;
                case 'e':
                    event.preventDefault();
                    if (!document.getElementById('exportBtn').disabled) {
                        exportHighlightedRowsToExcel();
                    }
                    break;
                case 'p':
                    event.preventDefault();
                    showXMLPreview();
                    break;
            }
        }
        
        if (event.key === 'Escape') {
            closeModal();
        }
    });
});

// Add some utility functions for better user experience
function copyToClipboard(text) {
    navigator.clipboard.writeText(text).then(() => {
        // Show temporary success message
        const toast = document.createElement('div');
        toast.textContent = 'Copied to clipboard!';
        toast.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            background: #28a745;
            color: white;
            padding: 10px 20px;
            border-radius: 5px;
            z-index: 10000;
            font-family: var(--font-family);
            font-weight: 500;
        `;
        document.body.appendChild(toast);
        setTimeout(() => document.body.removeChild(toast), 2000);
    });
}

// Add drag and drop functionality
function setupDragAndDrop() {
    const textareas = document.querySelectorAll('textarea');
    
    textareas.forEach(textarea => {
        textarea.addEventListener('dragover', (e) => {
            e.preventDefault();
            textarea.style.borderColor = '#007acc';
            textarea.style.backgroundColor = '#f0f8ff';
        });
        
        textarea.addEventListener('dragleave', (e) => {
            e.preventDefault();
            textarea.style.borderColor = '';
            textarea.style.backgroundColor = '';
        });
        
        textarea.addEventListener('drop', (e) => {
            e.preventDefault();
            textarea.style.borderColor = '';
            textarea.style.backgroundColor = '';
            
            const files = e.dataTransfer.files;
            if (files.length > 0) {
                const file = files[0];
                if (file.type === 'text/xml' || file.name.endsWith('.xml')) {
                    const reader = new FileReader();
                    reader.onload = (e) => {
                        textarea.value = e.target.result;
                        const infoId = textarea.id === 'devXML' ? 'devInfo' : 'prodInfo';
                        updateInputInfo(textarea.id, infoId);
                    };
                    reader.readAsText(file);
                } else {
                    alert('❌ Please drop only XML files.');
                }
            }
        });
    });
}

// Initialize drag and drop when page loads
document.addEventListener('DOMContentLoaded', setupDragAndDrop);

import React, { useState, useEffect } from 'react';
import * as XLSX from 'xlsx';
import { 
  Mail, 
  FileSpreadsheet,
  Bold,
  Italic,
  List,
  Type,
  Palette,
  Copy,
  Check,
  Eye,
  Code,
  Sparkles,
  AlertCircle,
  ChevronRight
} from 'lucide-react';

const RRDashboardWithEmailFormatter = () => {
  // Active tab state
  const [activeTab, setActiveTab] = useState('dashboard');
  
  // Dashboard states (from V6)
  const [file, setFile] = useState(null);
  const [processing, setProcessing] = useState(false);
  const [status, setStatus] = useState('');
  const [error, setError] = useState('');
  const [cleanedData, setCleanedData] = useState(null);
  const [showDashboard, setShowDashboard] = useState(false);
  const [downloadUrl, setDownloadUrl] = useState(null);
  const [filters, setFilters] = useState({
    property: '',
    properties: [],
    category: '',
    rentReady: '',
    search: '',
    rentMin: 0,
    rentMax: 5000,
    dateRange: {
      start: '',
      end: '',
      dateType: 'estimated'
    },
    showFlaggedOnly: false
  });
  const [sortConfig, setSortConfig] = useState({ key: null, direction: 'asc' });
  const [showAdvancedFilters, setShowAdvancedFilters] = useState(false);
  const [showPdfOptions, setShowPdfOptions] = useState(false);
  const [pdfOptions, setPdfOptions] = useState({
    format: 'table',
    includeColumns: {
      unitCode: true,
      property: true,
      category: true,
      unitDescription: true,
      askingRent: true,
      rentReady: true,
      estimatedReadyDate: true,
      actualReadyDate: true,
      daysUntilReady: true,
      comments: false,
      rentalType: false,
      vacateType: false,
      futureMoveInDate: false
    }
  });
  
  // Email Formatter states
  const [emailContent, setEmailContent] = useState('');
  const [formattedOutput, setFormattedOutput] = useState('');
  const [showPreview, setShowPreview] = useState(false);
  const [copied, setCopied] = useState(false);
  const [selectedTemplate, setSelectedTemplate] = useState('');
  
  // Email templates
  const emailTemplates = {
    inquiry: {
      name: 'Initial Inquiry Response',
      template: `Thank you for your inquiry!

***** NOW OFFERING!!! 2 MONTHS FREE!!!!!!!!! *****
(Select units, limited time offer, move in by [DATE] to qualify)

I'm [NAME], the Leasing Consultant for [PROPERTIES].

=== CURRENT AVAILABILITY & PRICING ===

>> AVAILABLE NOW (Immediate Move-in):
• 1-bedroom suites starting at $[PRICE]/month
• 2-bedroom suites starting at $[PRICE]/month

>> [MONTH] MOVE-IN READY:
• Bachelor suites starting at $[PRICE]/month
• 1-bedroom suites starting at $[PRICE]/month
• 2-bedroom suites starting at $[PRICE]/month

⚠️ IMPORTANT: Availability depends on units not being leased by the time you contact us.
💧 UTILITIES: Water and heat included, hydro extra.
📱 CONTACT: Virtual tours available! Call me directly at [PHONE].

Looking forward to seeing you soon!`
    },
    approval: {
      name: 'Approval Welcome Email',
      template: `Dear [TENANT NAME],

🏠 Welcome to Your New Home at Unit [NUMBER], [ADDRESS]!

You have officially been APPROVED! 

📋 PRE-MOVE-IN CHECKLIST

✅ STEP 1: TENANT INSURANCE (Required)
• $2,000,000 personal liability coverage
• Effective date must match key pickup date
• Recommended: Apollo Tenant Insurance

✅ STEP 2: UTILITY SETUP (Required)
• Provider: [UTILITY PROVIDER]
• Submit confirmation with name, address, start date

✅ STEP 3: RENT CAFÉ APP
• Registration code: T-CODE: [CODE]

✅ STEP 4: FINANCIAL REQUIREMENTS
• Last Month's Rent: $[AMOUNT]
• Key/Fob Deposit: $[AMOUNT]
• Less Application Deposit: -$500
• TOTAL DUE: $[AMOUNT]

Contact me at [PHONE] with questions!`
    },
    custom: {
      name: 'Custom Message',
      template: ''
    }
  };

  // Cleanup
  useEffect(() => {
    return () => {
      if (downloadUrl) {
        window.URL.revokeObjectURL(downloadUrl);
      }
    };
  }, [downloadUrl]);

  // Helper functions from V6
  const parseDate = (dateStr) => {
    if (!dateStr || dateStr === '') return null;
    try {
      const trimmed = dateStr.toString().trim();
      if (!trimmed) return null;
      
      const parts = trimmed.split('/');
      if (parts.length === 3) {
        const month = parseInt(parts[0]);
        const day = parseInt(parts[1]);
        const year = parseInt(parts[2]);
        return new Date(year, month - 1, day);
      }
    } catch (e) {
      console.warn('Date parsing error:', e);
    }
    return null;
  };

  const extractPropertyFromUnitType = (unitType) => {
    if (!unitType) return '';
    
    const trimmed = unitType.toString().trim();
    const withoutLeadingZeros = trimmed.replace(/^0+/, '');
    const match = withoutLeadingZeros.match(/^(\d+[a-z]+)/i);
    
    return match ? match[1] : '';
  };

  const extractBedroomCount = (description) => {
    const desc = description.toLowerCase();
    
    const match = desc.match(/(\d+)[\s-]*bedroom/);
    if (match) return parseInt(match[1]);
    
    if (desc.includes('bachelor') || desc.includes('studio') || desc.includes('0 bedroom')) return 0;
    
    return 999;
  };

  const categorizeUnit = (unit) => {
    const today = new Date();
    
    const rentalType = unit.rentalType.toLowerCase();
    const comments = unit.comments.toLowerCase();
    if (rentalType.includes('development') || rentalType.includes('model') || 
        rentalType.includes('hold') || rentalType.includes('down') || 
        comments.includes('development') || comments.includes('hold') || 
        comments.includes('model') || comments.includes('down')) {
      return 'Down/Hold/Model/Development';
    }
    
    if (unit.futureMoveInDate && unit.futureMoveInDate.toString().trim() !== '') {
      return 'Already Rented';
    }
    
    if (unit.rentReady === 'yes') {
      const hasActualReadyDate = unit.actualReadyDate && 
                                unit.actualReadyDate !== '' && 
                                unit.actualReadyDate !== null;
      
      if (hasActualReadyDate) {
        return 'Available & Rent Ready';
      } else {
        return 'Available & Rent Ready (Flagged)';
      }
    }
    
    if (unit.estimatedReadyDate) {
      const diffTime = unit.estimatedReadyDate - today;
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
      
      if (diffDays <= 30) return 'Available in Next 30 Days';
      if (diffDays <= 60) return 'Available in Next 31-60 Days';
      return 'Available in More than 60 Days';
    }
    
    return 'Unknown';
  };

  const getUnitStatus = (unit) => {
    if (unit.category === 'Already Rented') return 'Rented';
    if (unit.category === 'Down/Hold/Model/Development') return 'Not Available';
    if (unit.category === 'Available & Rent Ready') return 'Ready Now';
    return 'Future';
  };

  const calculateDaysUntilReady = (unit) => {
    const today = new Date();
    
    if (unit.rentReady === 'yes' && unit.actualReadyDate && unit.actualReadyDate !== '' && unit.actualReadyDate !== null) {
      let actualDate;
      
      if (unit.actualReadyDate instanceof Date) {
        actualDate = unit.actualReadyDate;
      } else {
        actualDate = new Date(unit.actualReadyDate);
        if (isNaN(actualDate)) {
          if (!unit.estimatedReadyDate) return null;
          const diffTime = unit.estimatedReadyDate - today;
          return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
        }
      }
      
      const diffTime = actualDate - today;
      return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    }
    
    if (!unit.estimatedReadyDate) return null;
    const diffTime = unit.estimatedReadyDate - today;
    return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  };

  const checkForIssues = (unit) => {
    const hasActualReadyDate = unit.actualReadyDate && 
                              unit.actualReadyDate !== '' && 
                              unit.actualReadyDate !== null;
    
    const hasMoveinDate = unit.futureMoveInDate && unit.futureMoveInDate.toString().trim() !== '';
    
    const isDownHoldModel = unit.category === 'Down/Hold/Model/Development';
    
    if (unit.rentReady === 'yes' && !hasActualReadyDate) {
      return true;
    }
    
    if (hasMoveinDate && unit.rentReady !== 'yes') {
      return true;
    }
    
    if (isDownHoldModel && unit.rentReady === 'yes') {
      return true;
    }
    
    return false;
  };

  const cleanAndProcessData = (jsonData) => {
    const cleanedUnits = [];
    
    for (let i = 6; i < jsonData.length; i++) {
      const row = jsonData[i];
      const firstCell = (row[0] || '').toString().trim();
      
      if (!row.some(cell => cell && cell.toString().trim() !== '')) continue;
      
      if (firstCell.toLowerCase().includes('total')) {
        continue;
      }
      
      if (firstCell.match(/^\s*[A-Z0-9-]+\s*$/i)) {
        const hasUnitData = row[1] && row[1].toString().trim() !== '' && 
                           (row[2] && row[2].toString().trim() !== '' || 
                            row[8] && parseFloat(row[8]) > 0);
        
        if (!hasUnitData) {
          continue;
        }

        const propertyCode = extractPropertyFromUnitType(row[1]);
        
        const unitData = {
          unitCode: firstCell,
          unitType: row[1] || '',
          unitDescription: row[2] || '',
          rentalType: row[3] || '',
          vacantAsOf: row[4] || '',
          vacateType: row[5] || '',
          futureMoveInDate: row[6] || '',
          workOrder: row[7] || '',
          askingRent: parseFloat(row[8]) || 0,
          makeReadyNotes: row[9] || '',
          estimatedReadyDate: parseDate(row[10]),
          rentReady: (row[11] || '').toString().toLowerCase(),
          actualReadyDate: row[12] || '',
          jobCode: row[13] || '',
          comments: row[14] || '',
          property: propertyCode,
          category: '',
          status: '',
          daysUntilReady: 0,
          hasIssues: false
        };
        
        unitData.category = categorizeUnit(unitData);
        unitData.status = getUnitStatus(unitData);
        unitData.daysUntilReady = calculateDaysUntilReady(unitData);
        unitData.hasIssues = checkForIssues(unitData);
        
        cleanedUnits.push(unitData);
      }
    }
    
    return cleanedUnits;
  };

  const processFile = async (file) => {
    setProcessing(true);
    setStatus('Reading Excel file...');
    setError('');

    try {
      const buffer = await file.arrayBuffer();
      const workbook = XLSX.read(buffer, { cellStyles: true, cellDates: true });
      const worksheet = workbook.Sheets[workbook.SheetNames[0]];
      
      setStatus('Parsing and cleaning data...');
      
      const jsonData = XLSX.utils.sheet_to_json(worksheet, { 
        header: 1, 
        defval: ''
      });

      setStatus('Processing units and extracting properties...');
      const processed = cleanAndProcessData(jsonData);
      
      setStatus(`✅ Success! Processed ${processed.length} units from your RR report.`);
      setCleanedData(processed);
      setShowDashboard(true);
      
    } catch (err) {
      setError(`Processing failed: ${err.message}`);
      console.error('Processing error:', err);
    } finally {
      setProcessing(false);
    }
  };

  const generatePDF = () => {
    if (!cleanedData) return;

    const filteredData = sortedAndFilteredData();
    const stats = getCategoryStats();

    const htmlContent = `
      <!DOCTYPE html>
      <html>
      <head>
        <title>RR Report Dashboard - ${new Date().toLocaleDateString()}</title>
        <style>
          * { margin: 0; padding: 0; box-sizing: border-box; }
          body { 
            font-family: Arial, sans-serif; 
            font-size: 12px; 
            line-height: 1.4;
            color: #333;
            padding: 20px;
          }
          .header { 
            text-align: center; 
            margin-bottom: 30px;
            border-bottom: 2px solid #333;
            padding-bottom: 15px;
          }
          .header h1 { font-size: 24px; margin-bottom: 5px; }
          .header p { color: #666; }
          .stats-grid { 
            display: grid; 
            grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); 
            gap: 15px; 
            margin-bottom: 30px;
          }
          .stat-card { 
            border: 1px solid #ddd; 
            padding: 12px; 
            border-radius: 4px;
            background: #f9f9f9;
          }
          .stat-card .number { font-size: 20px; font-weight: bold; color: #2563eb; }
          .stat-card .label { font-size: 11px; color: #666; margin-top: 4px; }
          table { 
            width: 100%; 
            border-collapse: collapse; 
            margin-bottom: 20px;
            font-size: 10px;
          }
          th, td { 
            border: 1px solid #ddd; 
            padding: 8px; 
            text-align: left;
            vertical-align: top;
          }
          th { 
            background-color: #f5f5f5; 
            font-weight: bold;
            font-size: 10px;
          }
          .category-ready { background-color: #d4edda; }
          .category-flagged { background-color: #fff3cd; }
          .category-30days { background-color: #cce5ff; }
          .category-60days { background-color: #e2d5f0; }
          .category-future { background-color: #f8f9fa; }
          .category-rented { background-color: #ffd6cc; }
          .category-down { background-color: #f8d7da; }
          .category-unknown { background-color: #fff3cd; }
          .flagged-row { background-color: #ffebee; }
          .rent-ready-yes { 
            background-color: #d4edda; 
            color: #155724; 
            padding: 2px 6px; 
            border-radius: 3px;
            font-size: 9px;
          }
          .rent-ready-no { 
            background-color: #f8f9fa; 
            color: #6c757d; 
            padding: 2px 6px; 
            border-radius: 3px;
            font-size: 9px;
          }
          .property-badge {
            background-color: #cce5ff;
            color: #004085;
            padding: 2px 6px;
            border-radius: 3px;
            font-size: 9px;
          }
          .days-ready { background-color: #d4edda; color: #155724; }
          .days-soon { background-color: #cce5ff; color: #004085; }
          .days-future { background-color: #f8f9fa; color: #6c757d; }
          .text-center { text-align: center; }
          .truncate { 
            max-width: 150px; 
            overflow: hidden; 
            text-overflow: ellipsis; 
            white-space: nowrap; 
          }
          .footer {
            margin-top: 30px;
            padding-top: 15px;
            border-top: 1px solid #ddd;
            text-align: center;
            color: #666;
            font-size: 10px;
          }
          @media print {
            body { font-size: 10px; margin: 0; padding: 15px; }
            .header { margin-bottom: 20px; }
            .stats-grid { margin-bottom: 20px; }
            table { font-size: 8px; }
            th, td { padding: 4px; }
            .stat-card .number { font-size: 16px; }
            .no-print { display: none; }
          }
        </style>
      </head>
      <body>
        <div class="header">
          <h1>🏢 RR Report Dashboard</h1>
          <p>Generated on ${new Date().toLocaleDateString()} at ${new Date().toLocaleTimeString()}</p>
          <p>Showing ${filteredData.length} of ${cleanedData.length} units</p>
        </div>

        ${pdfOptions.format === 'summary' ? `
          <div class="stats-grid">
            ${Object.entries(stats).map(([category, count]) => `
              <div class="stat-card">
                <div class="number">${count}</div>
                <div class="label">${category}</div>
              </div>
            `).join('')}
          </div>
        ` : ''}

        <table>
          <thead>
            <tr>
              ${pdfOptions.includeColumns.unitCode ? '<th>Unit</th>' : ''}
              ${pdfOptions.includeColumns.property ? '<th>Property</th>' : ''}
              ${pdfOptions.includeColumns.category ? '<th>Category</th>' : ''}
              ${pdfOptions.includeColumns.unitDescription ? '<th>Description</th>' : ''}
              ${pdfOptions.includeColumns.rentalType ? '<th>Type</th>' : ''}
              ${pdfOptions.includeColumns.askingRent ? '<th>Rent</th>' : ''}
              ${pdfOptions.includeColumns.rentReady ? '<th>Ready</th>' : ''}
              ${pdfOptions.includeColumns.estimatedReadyDate ? '<th>Est. Date</th>' : ''}
              ${pdfOptions.includeColumns.actualReadyDate ? '<th>Actual Date</th>' : ''}
              ${pdfOptions.includeColumns.daysUntilReady ? '<th>Days</th>' : ''}
              ${pdfOptions.includeColumns.vacateType ? '<th>Vacate</th>' : ''}
              ${pdfOptions.includeColumns.futureMoveInDate ? '<th>Move In</th>' : ''}
              ${pdfOptions.includeColumns.comments ? '<th>Comments</th>' : ''}
            </tr>
          </thead>
          <tbody>
            ${filteredData.map(unit => {
              const categoryClass = {
                'Available & Rent Ready': 'category-ready',
                'Available & Rent Ready (Flagged)': 'category-flagged',
                'Available in Next 30 Days': 'category-30days',
                'Available in Next 31-60 Days': 'category-60days',
                'Available in More than 60 Days': 'category-future',
                'Already Rented': 'category-rented',
                'Down/Hold/Model/Development': 'category-down',
                'Unknown': 'category-unknown'
              }[unit.category] || '';

              const daysClass = unit.daysUntilReady !== null ? (
                unit.daysUntilReady <= 0 ? 'days-ready' :
                unit.daysUntilReady <= 30 ? 'days-soon' : 'days-future'
              ) : '';

              return `
                <tr class="${unit.hasIssues ? 'flagged-row' : ''}">
                  ${pdfOptions.includeColumns.unitCode ? `<td><strong>${unit.unitCode}</strong></td>` : ''}
                  ${pdfOptions.includeColumns.property ? `<td><span class="property-badge">${unit.property}</span></td>` : ''}
                  ${pdfOptions.includeColumns.category ? `<td><div class="${categoryClass}" style="padding: 2px 6px; border-radius: 3px; font-size: 9px;">${unit.category}</div></td>` : ''}
                  ${pdfOptions.includeColumns.unitDescription ? `<td class="truncate">${unit.unitDescription}</td>` : ''}
                  ${pdfOptions.includeColumns.rentalType ? `<td>${unit.rentalType}</td>` : ''}
                  ${pdfOptions.includeColumns.askingRent ? `<td>$${unit.askingRent.toLocaleString()}</td>` : ''}
                  ${pdfOptions.includeColumns.rentReady ? `<td><span class="rent-ready-${unit.rentReady}">${unit.rentReady}${unit.hasIssues ? ' ⚠️' : ''}</span></td>` : ''}
                  ${pdfOptions.includeColumns.estimatedReadyDate ? `<td>${unit.estimatedReadyDate ? unit.estimatedReadyDate.toLocaleDateString() : '—'}</td>` : ''}
                  ${pdfOptions.includeColumns.actualReadyDate ? `<td>${unit.actualReadyDate ? (unit.actualReadyDate instanceof Date ? unit.actualReadyDate.toLocaleDateString() : unit.actualReadyDate.toString()) : '—'}</td>` : ''}
                  ${pdfOptions.includeColumns.daysUntilReady ? `<td class="text-center"><span class="${daysClass}" style="padding: 2px 6px; border-radius: 3px; font-size: 9px;">${unit.daysUntilReady !== null ? (unit.daysUntilReady <= 0 ? 'Ready' : `${unit.daysUntilReady}d`) : '—'}</span></td>` : ''}
                  ${pdfOptions.includeColumns.vacateType ? `<td>${unit.vacateType || '—'}</td>` : ''}
                  ${pdfOptions.includeColumns.futureMoveInDate ? `<td>${unit.futureMoveInDate || '—'}</td>` : ''}
                  ${pdfOptions.includeColumns.comments ? `<td class="truncate">${unit.comments}</td>` : ''}
                </tr>
              `;
            }).join('')}
          </tbody>
        </table>

        <div class="footer">
          <p>RR Report Dashboard - Data processed from Yardi Rent Ready export</p>
          <p>Flagged units (⚠️) indicate data quality issues that may need attention</p>
        </div>

        <script>
          window.onload = function() {
            setTimeout(function() {
              window.print();
            }, 500);
          };
        </script>
      </body>
      </html>
    `;

    const printWindow = window.open('', '_blank', 'width=1200,height=800,scrollbars=yes,resizable=yes');
    
    if (printWindow) {
      printWindow.document.write(htmlContent);
      printWindow.document.close();
      printWindow.focus();
    } else {
      alert('Popup blocked! Please allow popups for this site to generate PDF reports.');
    }
  };

  const exportToExcel = () => {
    if (!cleanedData) return;

    const workbook = XLSX.utils.book_new();

    const exportData = [
      [
        'Unit Code', 'Unit Type', 'Unit Description', 'Rental Type', 'Vacant As Of', 'Vacate Type',
        'Future Move In Date', 'Work Order', 'Asking Rent', 'Make Ready Notes', 'Estimated Ready Date',
        'Rent Ready', 'Actual Ready Date', 'Job Code', 'Comments', 'Property', 'Category', 'Status',
        'Days Until Ready', 'Has Issues'
      ],
      ...sortedAndFilteredData().map(unit => [
        unit.unitCode,
        unit.unitType,
        unit.unitDescription,
        unit.rentalType,
        unit.vacantAsOf,
        unit.vacateType,
        unit.futureMoveInDate,
        unit.workOrder,
        unit.askingRent,
        unit.makeReadyNotes,
        unit.estimatedReadyDate ? unit.estimatedReadyDate.toLocaleDateString() : '',
        unit.rentReady,
        unit.actualReadyDate ? (unit.actualReadyDate instanceof Date ? 
          unit.actualReadyDate.toLocaleDateString() : 
          unit.actualReadyDate.toString()) : '',
        unit.jobCode,
        unit.comments,
        unit.property,
        unit.category,
        unit.status,
        unit.daysUntilReady,
        unit.hasIssues ? 'Yes' : 'No'
      ])
    ];

    const worksheet = XLSX.utils.aoa_to_sheet(exportData);
    XLSX.utils.book_append_sheet(workbook, worksheet, 'RR Dashboard');

    const excelBuffer = XLSX.write(workbook, { 
      bookType: 'xlsx', 
      type: 'array'
    });

    const blob = new Blob([excelBuffer], { 
      type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
    });

    if (downloadUrl) {
      window.URL.revokeObjectURL(downloadUrl);
    }

    const url = window.URL.createObjectURL(blob);
    setDownloadUrl(url);
  };

  const handleFileUpload = (event) => {
    const uploadedFile = event.target.files[0];
    if (uploadedFile) {
      setFile(uploadedFile);
      setStatus('File selected. Ready to process.');
      setError('');
      setCleanedData(null);
      setShowDashboard(false);
      
      if (downloadUrl) {
        window.URL.revokeObjectURL(downloadUrl);
        setDownloadUrl(null);
      }
    }
  };

  const handleProcess = () => {
    if (file) {
      processFile(file);
    }
  };

  const sortedAndFilteredData = () => {
    if (!cleanedData) return [];
    
    let filtered = [...cleanedData];
    
    if (filters.property) {
      filtered = filtered.filter(unit => unit.property.toLowerCase().includes(filters.property.toLowerCase()));
    }
    
    if (filters.properties && filters.properties.length > 0) {
      filtered = filtered.filter(unit => filters.properties.includes(unit.property));
    }
    
    if (filters.category) {
      filtered = filtered.filter(unit => unit.category === filters.category);
    }
    if (filters.rentReady) {
      filtered = filtered.filter(unit => unit.rentReady === filters.rentReady);
    }
    if (filters.search) {
      filtered = filtered.filter(unit => 
        unit.unitCode.toLowerCase().includes(filters.search.toLowerCase()) ||
        unit.unitDescription.toLowerCase().includes(filters.search.toLowerCase()) ||
        unit.rentalType.toLowerCase().includes(filters.search.toLowerCase()) ||
        unit.makeReadyNotes.toLowerCase().includes(filters.search.toLowerCase()) ||
        unit.comments.toLowerCase().includes(filters.search.toLowerCase()) ||
        unit.jobCode.toLowerCase().includes(filters.search.toLowerCase())
      );
    }
    
    if (filters.rentMin > 0 || filters.rentMax < 5000) {
      filtered = filtered.filter(unit => 
        unit.askingRent >= filters.rentMin && unit.askingRent <= filters.rentMax
      );
    }
    
    if (filters.showFlaggedOnly) {
      filtered = filtered.filter(unit => unit.hasIssues === true);
    }
    
    if (filters.dateRange.start && filters.dateRange.end) {
      const startDate = new Date(filters.dateRange.start);
      const endDate = new Date(filters.dateRange.end);
      
      filtered = filtered.filter(unit => {
        let dateToCheck;
        if (filters.dateRange.dateType === 'actual') {
          if (!unit.actualReadyDate) return false;
          dateToCheck = unit.actualReadyDate instanceof Date ? 
            unit.actualReadyDate : new Date(unit.actualReadyDate);
        } else {
          if (!unit.estimatedReadyDate) return false;
          dateToCheck = unit.estimatedReadyDate;
        }
        
        return dateToCheck >= startDate && dateToCheck <= endDate;
      });
    }
    
    if (sortConfig.key) {
      filtered.sort((a, b) => {
        const aVal = a[sortConfig.key];
        const bVal = b[sortConfig.key];
        
        if (aVal < bVal) return sortConfig.direction === 'asc' ? -1 : 1;
        if (aVal > bVal) return sortConfig.direction === 'asc' ? 1 : -1;
        return 0;
      });
    } else {
      const categoryOrder = {
        'Available & Rent Ready': 1,
        'Available & Rent Ready (Flagged)': 2,
        'Available in Next 30 Days': 3,
        'Available in Next 31-60 Days': 4,
        'Available in More than 60 Days': 5,
        'Already Rented': 6,
        'Down/Hold/Model/Development': 7,
        'Unknown': 8
      };
      
      filtered.sort((a, b) => {
        const categoryA = categoryOrder[a.category] || 999;
        const categoryB = categoryOrder[b.category] || 999;
        
        if (categoryA !== categoryB) return categoryA - categoryB;
        
        const bedroomsA = extractBedroomCount(a.unitDescription);
        const bedroomsB = extractBedroomCount(b.unitDescription);
        
        if (bedroomsA !== bedroomsB) return bedroomsA - bedroomsB;
        
        return a.askingRent - b.askingRent;
      });
    }
    
    return filtered;
  };

  const handleSort = (key) => {
    let direction = 'asc';
    if (sortConfig.key === key && sortConfig.direction === 'asc') {
      direction = 'desc';
    }
    setSortConfig({ key, direction });
  };

  const getCategoryStats = () => {
    if (!cleanedData) return {};
    
    const stats = {};
    cleanedData.forEach(unit => {
      stats[unit.category] = (stats[unit.category] || 0) + 1;
    });
    return stats;
  };

  const getCategoryColor = (category) => {
    const colors = {
      'Available & Rent Ready': 'bg-green-100 text-green-800',
      'Available & Rent Ready (Flagged)': 'bg-yellow-100 text-yellow-800',
      'Available in Next 30 Days': 'bg-blue-100 text-blue-800',
      'Available in Next 31-60 Days': 'bg-purple-100 text-purple-800',
      'Available in More than 60 Days': 'bg-gray-100 text-gray-800',
      'Already Rented': 'bg-orange-100 text-orange-800',
      'Down/Hold/Model/Development': 'bg-red-100 text-red-800',
      'Unknown': 'bg-yellow-100 text-yellow-800'
    };
    return colors[category] || 'bg-gray-100 text-gray-800';
  };

  const applyPresetFilter = (presetName) => {
    const today = new Date();
    const nextWeek = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
    
    const presetFilters = {
      'Ready This Week': {
        ...filters,
        category: '',
        dateRange: {
          start: today.toISOString().split('T')[0],
          end: nextWeek.toISOString().split('T')[0],
          dateType: 'estimated'
        }
      },
      'Flagged Units': {
        ...filters,
        category: '',
        showFlaggedOnly: true
      }
    };

    if (presetFilters[presetName]) {
      setFilters(presetFilters[presetName]);
    }
  };

  // Email formatting functions
  const formatForRhenti = (text) => {
    let formatted = text;
    
    formatted = formatted.replace(/^=== (.+) ===/gm, '<h3 style="color: #2563eb; margin: 20px 0 10px 0;">$1</h3>');
    formatted = formatted.replace(/^--- (.+) ---/gm, '<h4 style="color: #4b5563; margin: 15px 0 8px 0;">$1</h4>');
    
    formatted = formatted.replace(/\*\*\*\*\* (.+?) \*\*\*\*\*/g, '<strong style="color: #dc2626; font-size: 16px;">$1</strong>');
    formatted = formatted.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>');
    formatted = formatted.replace(/\*(.+?)\*/g, '<em>$1</em>');
    
    formatted = formatted.replace(/^>> (.+)$/gm, '<div style="background: #eff6ff; padding: 8px; margin: 10px 0; border-left: 3px solid #2563eb;"><strong>$1</strong></div>');
    
    formatted = formatted.replace(/^• (.+)$/gm, '<li style="margin: 5px 0;">$1</li>');
    formatted = formatted.replace(/(<li.*?<\/li>\n?)+/g, '<ul style="margin: 10px 0; padding-left: 20px;">$&</ul>');
    
    formatted = formatted.replace(/✅/g, '<span style="color: #10b981;">✅</span>');
    formatted = formatted.replace(/⚠️/g, '<span style="color: #f59e0b;">⚠️</span>');
    formatted = formatted.replace(/💧/g, '<span style="color: #3b82f6;">💧</span>');
    formatted = formatted.replace(/📱/g, '<span style="color: #8b5cf6;">📱</span>');
    formatted = formatted.replace(/📋/g, '<span style="color: #6366f1;">📋</span>');
    formatted = formatted.replace(/🏠/g, '<span style="color: #059669;">🏠</span>');
    
    formatted = formatted.replace(/https?:\/\/[^\s<]+/g, '<a href="$&" style="color: #2563eb; text-decoration: underline;">$&</a>');
    formatted = formatted.replace(/[\w._%+-]+@[\w.-]+\.[A-Za-z]{2,}/g, '<a href="mailto:$&" style="color: #2563eb; text-decoration: underline;">$&</a>');
    
    formatted = formatted.replace(/\[([A-Z\s]+)\]/g, '<span style="background: #fef3c7; padding: 2px 4px; border-radius: 3px; font-weight: bold;">[<span style="color: #d97706;">$1</span>]</span>');
    
    formatted = formatted.replace(/\n{2,}/g, '</p><p style="margin: 10px 0;">');
    formatted = formatted.replace(/\n/g, '<br>');
    
    formatted = `<div style="font-family: Arial, sans-serif; font-size: 14px; line-height: 1.6; color: #1f2937;"><p style="margin: 10px 0;">${formatted}</p></div>`;
    
    return formatted;
  };

const generatePlainTextForRhenti = (html) => {
  let rhentiFormat = html.replace(/<div[^>]*>|<\/div>/g, '');
  rhentiFormat = rhentiFormat.replace(/<p[^>]*>|<\/p>/g, '');

  rhentiFormat = rhentiFormat.replace(/style="[^"]*"/g, (match) => {
    if (match.includes('color: #dc2626')) return 'style="color: red; font-weight: bold;"';
    if (match.includes('color: #2563eb')) return 'style="color: blue;"';
    if (match.includes('background: #eff6ff')) return 'style="background: #e6f2ff;"';
    return '';
  });

  // ✅ Add line breaks after <strong>, <span>, <br>, etc.
  rhentiFormat = rhentiFormat
    .replace(/<\/strong>/g, '</strong>\n')
    .replace(/<\/span>/g, '</span>\n')
    .replace(/<br\s*\/?>/g, '<br>\n')
    .replace(/<\/li>/g, '</li>\n');

  // ✅ Also optionally prettify ul
  rhentiFormat = rhentiFormat.replace(/<\/ul>/g, '</ul>\n');

  return rhentiFormat;
};

  const copyToClipboard = () => {
    const textToCopy = generatePlainTextForRhenti(formattedOutput);
    navigator.clipboard.writeText(textToCopy).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };

  const applyTemplate = (templateKey) => {
    setSelectedTemplate(templateKey);
    setEmailContent(emailTemplates[templateKey].template);
    if (emailTemplates[templateKey].template) {
      setFormattedOutput(formatForRhenti(emailTemplates[templateKey].template));
    }
  };

  const handleEmailContentChange = (e) => {
    setEmailContent(e.target.value);
    setFormattedOutput(formatForRhenti(e.target.value));
  };

  const insertFormatting = (before, after = '') => {
    const textarea = document.getElementById('email-textarea');
    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const selectedText = emailContent.substring(start, end);
    const newText = emailContent.substring(0, start) + before + selectedText + after + emailContent.substring(end);
    setEmailContent(newText);
    setFormattedOutput(formatForRhenti(newText));
    
    setTimeout(() => {
      textarea.focus();
      textarea.setSelectionRange(start + before.length, start + before.length + selectedText.length);
    }, 0);
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-4">
            <div className="flex items-center space-x-4">
              <h1 className="text-2xl font-bold text-gray-900">
                🏢 Leasing Operations Hub
              </h1>
              <span className="px-3 py-1 bg-blue-100 text-blue-800 rounded-full text-xs font-semibold">
                V7.0
              </span>
            </div>
            <div className="flex space-x-2">
              <button
                onClick={() => setActiveTab('dashboard')}
                className={`px-4 py-2 rounded-lg flex items-center gap-2 transition-colors ${
                  activeTab === 'dashboard' 
                    ? 'bg-blue-600 text-white' 
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                <FileSpreadsheet size={18} />
                RR Dashboard
              </button>
              <button
                onClick={() => setActiveTab('email')}
                className={`px-4 py-2 rounded-lg flex items-center gap-2 transition-colors ${
                  activeTab === 'email' 
                    ? 'bg-blue-600 text-white' 
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                <Mail size={18} />
                Email Formatter
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {activeTab === 'dashboard' ? (
          /* RR Dashboard Tab (Full V6 Functionality) */
          <div className="space-y-6">
            {!showDashboard ? (
              <div className="bg-white rounded-lg shadow-lg p-6">
                <div className="text-center mb-8">
                  <h2 className="text-3xl font-bold text-gray-800 mb-2">
                    🏢 RR Report Dashboard & Sorting
                  </h2>
                  <p className="text-gray-600">
                    Upload your Yardi Rent Ready report for interactive dashboard with filtering and sorting
                  </p>
                </div>

                <div className="mb-6">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Select your RR Report Excel file:
                  </label>
                  <input
                    type="file"
                    accept=".xlsx,.xls"
                    onChange={handleFileUpload}
                    className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
                  />
                </div>

                <div className="mb-6">
                  <button
                    onClick={handleProcess}
                    disabled={!file || processing}
                    className="w-full py-3 px-6 bg-blue-600 text-white font-semibold rounded-lg hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors"
                  >
                    {processing ? (
                      <div className="flex items-center justify-center gap-2">
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                        Processing...
                      </div>
                    ) : (
                      '🚀 Process & Create Dashboard'
                    )}
                  </button>
                </div>

                {status && (
                  <div className="mb-4 p-4 bg-blue-50 border-l-4 border-blue-400 text-blue-700">
                    <p className="font-medium">Status: {status}</p>
                  </div>
                )}

                {error && (
                  <div className="mb-4 p-4 bg-red-50 border-l-4 border-red-400 text-red-700">
                    <p className="font-medium">Error: {error}</p>
                  </div>
                )}

                <div className="mt-8 p-6 bg-gray-50 rounded-lg">
                  <h3 className="font-semibold text-gray-800 mb-4">🔧 What This Does:</h3>
                  <ol className="list-decimal list-inside space-y-2 text-sm text-gray-600">
                    <li><strong>Enhanced unit detection:</strong> Processes alphanumeric units (A16, BB2, 001A, E-003, PH04)</li>
                    <li><strong>Smart property extraction:</strong> Extracts property codes from Unit Type (e.g., 0014t11c → 14t)</li>
                    <li><strong>Advanced categorization:</strong> Available & Ready, Flagged, Next 30/60 days, Rented, Hold/Development</li>
                    <li><strong>Advanced filtering:</strong> Rent sliders, date ranges, multi-property selection, visual filter indicators</li>
                    <li><strong>Smart presets:</strong> "Ready This Week" (estimated dates), "Flagged Units" (data issues)</li>
                    <li><strong>Enhanced flagging:</strong> Rent ready without dates, rented but not ready, development but ready</li>
                    <li><strong>Smart days calculation:</strong> Uses actual ready date for ready units, estimated for others</li>
                    <li><strong>Excel export:</strong> Download cleaned data with all analysis columns</li>
                    <li><strong>PDF export:</strong> Print-optimized reports with customizable columns</li>
                  </ol>
                </div>
              </div>
            ) : (
              <>
                {/* Dashboard Header */}
                <div className="flex justify-between items-center">
                  <div>
                    <h2 className="text-2xl font-bold text-gray-800">📊 Interactive RR Dashboard</h2>
                    <p className="text-gray-600">{cleanedData.length} units processed</p>
                  </div>
                  <div className="flex gap-3">
                    <button
                      onClick={() => setShowPdfOptions(!showPdfOptions)}
                      className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors"
                    >
                      📄 Generate PDF
                    </button>
                    
                    {!downloadUrl ? (
                      <button
                        onClick={exportToExcel}
                        className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
                      >
                        📥 Prepare Excel Export
                      </button>
                    ) : (
                      <div className="flex gap-2">
                        <a
                          href={downloadUrl}
                          download={`RR_Dashboard_${new Date().toISOString().split('T')[0]}.xlsx`}
                          className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors text-center"
                        >
                          📄 Download Excel
                        </a>
                        <span className="text-xs text-gray-500 self-center">
                          👆 Right-click → "Save link as"
                        </span>
                      </div>
                    )}
                    
                    <button
                      onClick={() => setShowDashboard(false)}
                      className="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors"
                    >
                      🔄 Process New File
                    </button>
                  </div>
                </div>

                {/* PDF Export Options */}
                {showPdfOptions && (
                  <div className="p-4 bg-purple-50 rounded-lg border border-purple-200">
                    <h3 className="font-semibold text-purple-800 mb-3">📄 PDF Export Options</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">Format</label>
                        <select
                          value={pdfOptions.format}
                          onChange={(e) => setPdfOptions({...pdfOptions, format: e.target.value})}
                          className="w-full p-2 border border-gray-300 rounded text-sm"
                        >
                          <option value="table">Table Format (Detailed)</option>
                          <option value="summary">Summary Report (with Stats)</option>
                        </select>
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">Include Columns</label>
                        <div className="grid grid-cols-2 gap-2 max-h-40 overflow-y-auto">
                          {Object.entries({
                            unitCode: 'Unit Code',
                            property: 'Property',
                            category: 'Category',
                            unitDescription: 'Description',
                            rentalType: 'Rental Type',
                            askingRent: 'Asking Rent',
                            rentReady: 'Rent Ready',
                            estimatedReadyDate: 'Est. Date',
                            actualReadyDate: 'Actual Date',
                            daysUntilReady: 'Days Until Ready',
                            vacateType: 'Vacate Type',
                            futureMoveInDate: 'Move In Date',
                            comments: 'Comments'
                          }).map(([key, label]) => (
                            <label key={key} className="flex items-center">
                              <input
                                type="checkbox"
                                checked={pdfOptions.includeColumns[key]}
                                onChange={(e) => setPdfOptions({
                                  ...pdfOptions,
                                  includeColumns: {...pdfOptions.includeColumns, [key]: e.target.checked}
                                })}
                                className="mr-2"
                              />
                              <span className="text-xs">{label}</span>
                            </label>
                          ))}
                        </div>
                      </div>
                    </div>
                    <div className="mt-4 flex gap-2">
                      <button
                        onClick={generatePDF}
                        className="px-4 py-2 bg-purple-600 text-white rounded hover:bg-purple-700 transition-colors"
                      >
                        🖨️ Open Print Preview
                      </button>
                      <button
                        onClick={() => setShowPdfOptions(false)}
                        className="px-4 py-2 bg-gray-300 text-gray-700 rounded hover:bg-gray-400 transition-colors"
                      >
                        Cancel
                      </button>
                    </div>
                    <p className="text-xs text-gray-600 mt-2">
                      💡 This will open a new window with print-optimized formatting. Use your browser's Print → Save as PDF option.
                    </p>
                  </div>
                )}

                {/* Category Summary Cards */}
                <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-8 gap-4">
                  {Object.entries(getCategoryStats()).map(([category, count]) => (
                    <div key={category} className={`p-3 rounded-lg ${getCategoryColor(category)}`}>
                      <div className="text-lg font-bold">{count}</div>
                      <div className="text-xs leading-tight">{category.replace(' in ', '\nin ').replace(' (Flagged)', '\n(Flagged)')}</div>
                    </div>
                  ))}
                </div>

                {/* Filters */}
                <div className="bg-gray-50 rounded-lg p-4 space-y-4">
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Property</label>
                      <select
                        value={filters.property}
                        onChange={(e) => setFilters({...filters, property: e.target.value})}
                        className={`w-full p-2 border rounded text-sm transition-colors ${
                          filters.property ? 'border-blue-400 bg-blue-50' : 'border-gray-300'
                        }`}
                      >
                        <option value="">All Properties</option>
                        {[...new Set(cleanedData.map(unit => unit.property))].map(prop => (
                          <option key={prop} value={prop}>{prop}</option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Category</label>
                      <select
                        value={filters.category}
                        onChange={(e) => setFilters({...filters, category: e.target.value})}
                        className={`w-full p-2 border rounded text-sm transition-colors ${
                          filters.category ? 'border-green-400 bg-green-50' : 'border-gray-300'
                        }`}
                      >
                        <option value="">All Categories</option>
                        {Object.keys(getCategoryStats()).map(cat => (
                          <option key={cat} value={cat}>{cat}</option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Rent Ready</label>
                      <select
                        value={filters.rentReady}
                        onChange={(e) => setFilters({...filters, rentReady: e.target.value})}
                        className={`w-full p-2 border rounded text-sm transition-colors ${
                          filters.rentReady ? 'border-purple-400 bg-purple-50' : 'border-gray-300'
                        }`}
                      >
                        <option value="">All</option>
                        <option value="yes">Yes</option>
                        <option value="no">No</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">Search</label>
                      <input
                        type="text"
                        placeholder="Unit, description, comments..."
                        value={filters.search}
                        onChange={(e) => setFilters({...filters, search: e.target.value})}
                        className={`w-full p-2 border rounded text-sm transition-colors ${
                          filters.search ? 'border-orange-400 bg-orange-50' : 'border-gray-300'
                        }`}
                      />
                    </div>
                  </div>

                  <div className="flex justify-between items-center">
                    <div className="flex gap-2">
                      <button
                        onClick={() => setShowAdvancedFilters(!showAdvancedFilters)}
                        className="px-3 py-1 bg-blue-600 text-white rounded text-sm hover:bg-blue-700"
                      >
                        {showAdvancedFilters ? 'Hide' : 'Show'} Advanced Filters
                      </button>
                      
                      <div className="flex gap-1">
                        <button 
                          onClick={() => applyPresetFilter('Ready This Week')} 
                          className={`px-2 py-1 rounded text-xs transition-colors ${
                            filters.dateRange.start && filters.dateRange.dateType === 'estimated' 
                              ? 'bg-blue-200 text-blue-800 border border-blue-300' 
                              : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                          }`}
                        >
                          Ready This Week
                        </button>
                        <button 
                          onClick={() => applyPresetFilter('Flagged Units')} 
                          className={`px-2 py-1 rounded text-xs transition-colors ${
                            filters.showFlaggedOnly 
                              ? 'bg-red-200 text-red-800 border border-red-300' 
                              : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                          }`}
                        >
                          Flagged Units
                        </button>
                      </div>
                    </div>
                    
                    <button
                      onClick={() => setFilters({
                        property: '',
                        properties: [],
                        category: '',
                        rentReady: '',
                        search: '',
                        rentMin: 0,
                        rentMax: 5000,
                        dateRange: { start: '', end: '', dateType: 'estimated' },
                        showFlaggedOnly: false
                      })}
                      className="px-3 py-1 bg-red-600 text-white rounded text-sm hover:bg-red-700"
                    >
                      Clear All
                    </button>
                  </div>

                  <div className="flex flex-wrap gap-2">
                    {filters.property && (
                      <span className="px-2 py-1 bg-blue-100 text-blue-800 rounded-full text-xs">
                        Property: {filters.property}
                      </span>
                    )}
                    {filters.properties.length > 0 && (
                      <span className="px-2 py-1 bg-blue-100 text-blue-800 rounded-full text-xs">
                        Properties: {filters.properties.join(', ')}
                      </span>
                    )}
                    {filters.category && (
                      <span className="px-2 py-1 bg-green-100 text-green-800 rounded-full text-xs">
                        Category: {filters.category}
                      </span>
                    )}
                    {filters.rentReady && (
                      <span className="px-2 py-1 bg-purple-100 text-purple-800 rounded-full text-xs">
                        Rent Ready: {filters.rentReady}
                      </span>
                    )}
                    {filters.search && (
                      <span className="px-2 py-1 bg-orange-100 text-orange-800 rounded-full text-xs">
                        Search: "{filters.search}"
                      </span>
                    )}
                    {(filters.rentMin > 0 || filters.rentMax < 5000) && (
                      <span className="px-2 py-1 bg-yellow-100 text-yellow-800 rounded-full text-xs">
                        Rent: ${filters.rentMin} - ${filters.rentMax}
                      </span>
                    )}
                    {filters.dateRange.start && filters.dateRange.end && (
                      <span className="px-2 py-1 bg-indigo-100 text-indigo-800 rounded-full text-xs">
                        {filters.dateRange.dateType === 'actual' ? 'Actual' : 'Estimated'} Date: {filters.dateRange.start} to {filters.dateRange.end}
                      </span>
                    )}
                    {filters.showFlaggedOnly && (
                      <span className="px-2 py-1 bg-red-100 text-red-800 rounded-full text-xs">
                        Flagged Units Only
                      </span>
                    )}
                  </div>

                  {showAdvancedFilters && (
                    <div className="border-t pt-4 space-y-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Rent Range: ${filters.rentMin} - ${filters.rentMax}
                          {(filters.rentMin > 0 || filters.rentMax < 5000) && (
                            <span className="ml-2 px-2 py-1 bg-yellow-100 text-yellow-800 rounded-full text-xs">Active</span>
                          )}
                        </label>
                        <div className="flex gap-4 items-center">
                          <input
                            type="range"
                            min="0"
                            max="5000"
                            step="50"
                            value={filters.rentMin}
                            onChange={(e) => setFilters({...filters, rentMin: parseInt(e.target.value)})}
                            className="flex-1"
                          />
                          <input
                            type="range"
                            min="0"
                            max="5000"
                            step="50"
                            value={filters.rentMax}
                            onChange={(e) => setFilters({...filters, rentMax: parseInt(e.target.value)})}
                            className="flex-1"
                          />
                        </div>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">
                            Date Type
                            {filters.dateRange.start && filters.dateRange.end && (
                              <span className="ml-2 px-2 py-1 bg-indigo-100 text-indigo-800 rounded-full text-xs">Active</span>
                            )}
                          </label>
                          <select
                            value={filters.dateRange.dateType}
                            onChange={(e) => setFilters({...filters, dateRange: {...filters.dateRange, dateType: e.target.value}})}
                            className="w-full p-2 border border-gray-300 rounded text-sm"
                          >
                            <option value="estimated">Estimated Ready Date</option>
                            <option value="actual">Actual Ready Date</option>
                          </select>
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">From Date</label>
                          <input
                            type="date"
                            value={filters.dateRange.start}
                            onChange={(e) => setFilters({...filters, dateRange: {...filters.dateRange, start: e.target.value}})}
                            className={`w-full p-2 border rounded text-sm transition-colors ${
                              filters.dateRange.start ? 'border-indigo-400 bg-indigo-50' : 'border-gray-300'
                            }`}
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">To Date</label>
                          <input
                            type="date"
                            value={filters.dateRange.end}
                            onChange={(e) => setFilters({...filters, dateRange: {...filters.dateRange, end: e.target.value}})}
                            className={`w-full p-2 border rounded text-sm transition-colors ${
                              filters.dateRange.end ? 'border-indigo-400 bg-indigo-50' : 'border-gray-300'
                            }`}
                          />
                        </div>
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Select Multiple Properties
                          {filters.properties.length > 0 && (
                            <span className="ml-2 px-2 py-1 bg-blue-100 text-blue-800 rounded-full text-xs">
                              {filters.properties.length} selected
                            </span>
                          )}
                        </label>
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                          {[...new Set(cleanedData.map(unit => unit.property))].map(prop => (
                            <label key={prop} className="flex items-center">
                              <input
                                type="checkbox"
                                checked={filters.properties.includes(prop)}
                                onChange={(e) => {
                                  if (e.target.checked) {
                                    setFilters({...filters, properties: [...filters.properties, prop]});
                                  } else {
                                    setFilters({...filters, properties: filters.properties.filter(p => p !== prop)});
                                  }
                                }}
                                className="mr-2"
                              />
                              <span className={`text-sm ${
                                filters.properties.includes(prop) ? 'font-semibold text-blue-700' : ''
                              }`}>{prop}</span>
                            </label>
                          ))}
                        </div>
                      </div>
                    </div>
                  )}
                </div>

                {/* Data Table */}
                <div className="bg-white rounded-lg border overflow-hidden">
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead className="bg-gray-50">
                        <tr>
                          {[
                            {key: 'unitCode', label: 'Unit'},
                            {key: 'property', label: 'Property'},
                            {key: 'category', label: 'Category'},
                            {key: 'unitDescription', label: 'Description'},
                            {key: 'rentalType', label: 'Type'},
                            {key: 'askingRent', label: 'Rent'},
                            {key: 'rentReady', label: 'Ready'},
                            {key: 'estimatedReadyDate', label: 'Est. Date'},
                            {key: 'actualReadyDate', label: 'Actual Date'},
                            {key: 'daysUntilReady', label: 'Days'},
                            {key: 'vacateType', label: 'Vacate'},
                            {key: 'futureMoveInDate', label: 'Move In'},
                            {key: 'comments', label: 'Comments'}
                          ].map(col => (
                            <th 
                              key={col.key}
                              className="p-3 text-left cursor-pointer hover:bg-gray-100 border-b"
                              onClick={() => handleSort(col.key)}
                            >
                              <div className="flex items-center gap-1">
                                {col.label}
                                {sortConfig.key === col.key && (
                                  <span className="text-blue-600">
                                    {sortConfig.direction === 'asc' ? '↑' : '↓'}
                                  </span>
                                )}
                              </div>
                            </th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {sortedAndFilteredData().map((unit, index) => (
                          <tr key={`${unit.property}-${unit.unitCode}`} 
                              className={`hover:bg-gray-50 ${unit.hasIssues ? 'bg-red-50' : ''}`}>
                            <td className="p-3 font-medium">{unit.unitCode}</td>
                            <td className="p-3">
                              <span className="px-2 py-1 bg-blue-100 text-blue-800 rounded text-xs">
                                {unit.property}
                              </span>
                            </td>
                            <td className="p-3">
                              <span className={`px-2 py-1 rounded text-xs ${getCategoryColor(unit.category)}`}>
                                {unit.category}
                              </span>
                            </td>
                            <td className="p-3 max-w-xs truncate">{unit.unitDescription}</td>
                            <td className="p-3 text-xs">{unit.rentalType}</td>
                            <td className="p-3">${unit.askingRent.toLocaleString()}</td>
                            <td className="p-3">
                              <span className={`px-2 py-1 rounded text-xs ${
                                unit.rentReady === 'yes' ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'
                              }`}>
                                {unit.rentReady}
                              </span>
                              {unit.hasIssues && <span className="text-red-500 ml-1">⚠️</span>}
                            </td>
                            <td className="p-3">
                              {unit.estimatedReadyDate ? unit.estimatedReadyDate.toLocaleDateString() : '—'}
                            </td>
                            <td className="p-3">
                              {unit.actualReadyDate ? (
                                <span className="px-2 py-1 bg-green-100 text-green-800 rounded text-xs">
                                  {unit.actualReadyDate instanceof Date ? 
                                    unit.actualReadyDate.toLocaleDateString() : 
                                    unit.actualReadyDate.toString()}
                                </span>
                              ) : (
                                <span className="text-gray-400">—</span>
                              )}
                            </td>
                            <td className="p-3">
                              {unit.daysUntilReady !== null ? (
                                <span className={`px-2 py-1 rounded text-xs ${
                                  unit.daysUntilReady <= 0 ? 'bg-green-100 text-green-800' :
                                  unit.daysUntilReady <= 30 ? 'bg-blue-100 text-blue-800' :
                                  'bg-gray-100 text-gray-800'
                                }`}>
                                  {unit.daysUntilReady <= 0 ? 'Ready' : `${unit.daysUntilReady}d`}
                                </span>
                              ) : '—'}
                            </td>
                            <td className="p-3 text-xs">{unit.vacateType || '—'}</td>
                            <td className="p-3 text-xs">{unit.futureMoveInDate || '—'}</td>
                            <td className="p-3 max-w-xs truncate">{unit.comments}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>

                  {sortedAndFilteredData().length === 0 && (
                    <div className="p-8 text-center text-gray-500">
                      No units match your current filters.
                    </div>
                  )}
                </div>

                <div className="text-sm text-gray-600 text-center">
                  Showing {sortedAndFilteredData().length} of {cleanedData.length} units
                </div>
              </>
            )}
          </div>
        ) : (
          /* Email Formatter Tab */
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="bg-white rounded-lg shadow-lg p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-gray-800 flex items-center gap-2">
                  <Mail className="text-blue-600" size={20} />
                  Email Composer
                </h3>
                <div className="flex items-center gap-2">
                  <Sparkles className="text-yellow-500" size={16} />
                  <span className="text-xs text-gray-600">Rhenti Optimized</span>
                </div>
              </div>

              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Quick Templates
                </label>
                <select
                  value={selectedTemplate}
                  onChange={(e) => applyTemplate(e.target.value)}
                  className="w-full p-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                >
                  <option value="">Select a template...</option>
                  {Object.entries(emailTemplates).map(([key, template]) => (
                    <option key={key} value={key}>{template.name}</option>
                  ))}
                </select>
              </div>

              <div className="flex flex-wrap gap-1 mb-3 p-2 bg-gray-50 rounded-lg">
                <button
                  onClick={() => insertFormatting('**', '**')}
                  className="p-2 hover:bg-white rounded transition-colors"
                  title="Bold"
                >
                  <Bold size={16} />
                </button>
                <button
                  onClick={() => insertFormatting('*', '*')}
                  className="p-2 hover:bg-white rounded transition-colors"
                  title="Italic"
                >
                  <Italic size={16} />
                </button>
                <button
                  onClick={() => insertFormatting('• ')}
                  className="p-2 hover:bg-white rounded transition-colors"
                  title="Bullet Point"
                >
                  <List size={16} />
                </button>
                <button
                  onClick={() => insertFormatting('=== ', ' ===')}
                  className="p-2 hover:bg-white rounded transition-colors"
                  title="Header"
                >
                  <Type size={16} />
                </button>
                <button
                  onClick={() => insertFormatting('>> ')}
                  className="p-2 hover:bg-white rounded transition-colors"
                  title="Section"
                >
                  <ChevronRight size={16} />
                </button>
                <button
                  onClick={() => insertFormatting('***** ', ' *****')}
                  className="p-2 hover:bg-white rounded transition-colors"
                  title="Highlight"
                >
                  <Palette size={16} />
                </button>
                <button
                  onClick={() => insertFormatting('[', ']')}
                  className="p-2 hover:bg-white rounded transition-colors"
                  title="Placeholder"
                >
                  <Code size={16} />
                </button>
              </div>

              <textarea
                id="email-textarea"
                value={emailContent}
                onChange={handleEmailContentChange}
                placeholder="Type or paste your email content here...

Use formatting:
**text** for bold
*text* for italic
=== Header ===
>> Section header
• Bullet points
[PLACEHOLDER] for variables
***** HIGHLIGHT TEXT *****"
                className="w-full h-96 p-4 border border-gray-300 rounded-lg font-mono text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              />

              <div className="mt-3 p-3 bg-blue-50 rounded-lg">
                <div className="flex items-start gap-2">
                  <AlertCircle className="text-blue-600 mt-0.5" size={16} />
                  <div className="text-xs text-blue-800">
                    <p className="font-semibold mb-1">Pro Tips:</p>
                    <ul className="space-y-1">
                      <li>• Use [PLACEHOLDERS] for dynamic content</li>
                      <li>• Emojis are preserved and styled</li>
                      <li>• URLs and emails are auto-linked</li>
                      <li>• Copy output directly to Rhenti</li>
                    </ul>
                  </div>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-lg shadow-lg p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-gray-800 flex items-center gap-2">
                  <Code className="text-green-600" size={20} />
                  Formatted Output
                </h3>
                <div className="flex gap-2">
                  <button
                    onClick={() => setShowPreview(!showPreview)}
                    className={`px-3 py-1 rounded-lg text-sm flex items-center gap-1 transition-colors ${
                      showPreview 
                        ? 'bg-purple-100 text-purple-700' 
                        : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                    }`}
                  >
                    <Eye size={14} />
                    {showPreview ? 'Preview' : 'HTML'}
                  </button>
                  <button
                    onClick={copyToClipboard}
                    className={`px-3 py-1 rounded-lg text-sm flex items-center gap-1 transition-colors ${
                      copied 
                        ? 'bg-green-100 text-green-700' 
                        : 'bg-blue-600 text-white hover:bg-blue-700'
                    }`}
                  >
                    {copied ? <Check size={14} /> : <Copy size={14} />}
                    {copied ? 'Copied!' : 'Copy for Rhenti'}
                  </button>
                </div>
              </div>

              <div className="border border-gray-200 rounded-lg overflow-hidden">
                {showPreview ? (
                  <div 
                    className="p-4 bg-gray-50 min-h-[400px] max-h-[600px] overflow-y-auto"
                    dangerouslySetInnerHTML={{ __html: formattedOutput || '<p style="color: #9ca3af;">Your formatted email will appear here...</p>' }}
                  />
                ) : (
                  <pre className="p-4 bg-gray-900 text-green-400 text-xs overflow-x-auto min-h-[400px] max-h-[600px] overflow-y-auto">
                    <code>{generatePlainTextForRhenti(formattedOutput) || '// HTML output will appear here...'}</code>
                  </pre>
                )}
              </div>

              <div className="mt-3 p-3 bg-green-50 rounded-lg">
                <div className="flex items-start gap-2">
                  <Check className="text-green-600 mt-0.5" size={16} />
                  <div className="text-xs text-green-800">
                    <p className="font-semibold mb-1">Ready for Rhenti!</p>
                    <p>This output is optimized for Rhenti's email system and will display correctly in prospect emails.</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default RRDashboardWithEmailFormatter;

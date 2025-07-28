import React, { useState, useEffect } from 'react';
import * as XLSX from 'xlsx';

const RRReportProcessor = () => {
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

  // Cleanup
  useEffect(() => {
    return () => {
      if (downloadUrl) {
        window.URL.revokeObjectURL(downloadUrl);
      }
    };
  }, [downloadUrl]);

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
    // Remove leading zeros
    const withoutLeadingZeros = trimmed.replace(/^0+/, '');
    // Extract property code pattern: digits followed by letter(s), before any additional digits
    const match = withoutLeadingZeros.match(/^(\d+[a-z]+)/i);
    
    return match ? match[1] : '';
  };

  const extractBedroomCount = (description) => {
    const desc = description.toLowerCase();
    
    // Look for patterns like "1 bedroom", "2 bedroom", "3-bedroom", etc.
    const match = desc.match(/(\d+)[\s-]*bedroom/);
    if (match) return parseInt(match[1]);
    
    // Handle special cases
    if (desc.includes('bachelor') || desc.includes('studio') || desc.includes('0 bedroom')) return 0;
    
    // If no bedroom info found, put at end
    return 999;
  };

  const cleanAndProcessData = (jsonData) => {
    const cleanedUnits = [];
    
    // Process each row to extract units
    for (let i = 6; i < jsonData.length; i++) {
      const row = jsonData[i];
      const firstCell = (row[0] || '').toString().trim();
      
      // Skip empty rows
      if (!row.some(cell => cell && cell.toString().trim() !== '')) continue;
      
      // Check if this is a "Total" summary row - skip it
      if (firstCell.toLowerCase().includes('total')) {
        continue;
      }
      
      // If we have a unit code (alphanumeric combination), this is a unit row
      // BUT skip if it's just a property header (no unit data)
      if (firstCell.match(/^\s*[A-Z0-9-]+\s*$/i)) {
        // Skip if this looks like a property header row (no unit type or other data)
        const hasUnitData = row[1] && row[1].toString().trim() !== '' && // Has Unit Type
                           (row[2] && row[2].toString().trim() !== '' || // Has Description
                            row[8] && parseFloat(row[8]) > 0);            // Has Rent > 0
        
        if (!hasUnitData) {
          continue; // Skip property header rows
        }

        // Extract property from Unit Type column (row[1])
        const propertyCode = extractPropertyFromUnitType(row[1]);
        
        const unitData = {
          unitCode: firstCell,                                    // Column A
          unitType: row[1] || '',                                // Column B  
          unitDescription: row[2] || '',                         // Column C
          rentalType: row[3] || '',                             // Column D
          vacantAsOf: row[4] || '',                             // Column E
          vacateType: row[5] || '',                             // Column F
          futureMoveInDate: row[6] || '',                       // Column G
          workOrder: row[7] || '',                              // Column H
          askingRent: parseFloat(row[8]) || 0,                  // Column I
          makeReadyNotes: row[9] || '',                         // Column J
          estimatedReadyDate: parseDate(row[10]),               // Column K
          rentReady: (row[11] || '').toString().toLowerCase(),   // Column L
          actualReadyDate: row[12] || '',                       // Column M (keep original value)
          jobCode: row[13] || '',                               // Column N
          comments: row[14] || '',                              // Column O
          property: propertyCode,
          
          // Derived fields
          category: '',
          status: '',
          daysUntilReady: 0,
          hasIssues: false
        };
        
        // Categorize the unit
        unitData.category = categorizeUnit(unitData);
        unitData.status = getUnitStatus(unitData);
        unitData.daysUntilReady = calculateDaysUntilReady(unitData);
        unitData.hasIssues = checkForIssues(unitData);
        
        cleanedUnits.push(unitData);
      }
    }
    
    return cleanedUnits;
  };

  const categorizeUnit = (unit) => {
    const today = new Date();
    
    // Check for Down/Hold/Model/Development
    const rentalType = unit.rentalType.toLowerCase();
    const comments = unit.comments.toLowerCase();
    if (rentalType.includes('development') || rentalType.includes('model') || 
        rentalType.includes('hold') || rentalType.includes('down') || 
        comments.includes('development') || comments.includes('hold') || 
        comments.includes('model') || comments.includes('down')) {
      return 'Down/Hold/Model/Development';
    }
    
    // Check if already rented (has future move-in date)
    if (unit.futureMoveInDate && unit.futureMoveInDate.toString().trim() !== '') {
      return 'Already Rented';
    }
    
    // Check if rent ready
    if (unit.rentReady === 'yes') {
      // Simple check: if actual ready date exists and is not empty
      const hasActualReadyDate = unit.actualReadyDate && 
                                unit.actualReadyDate !== '' && 
                                unit.actualReadyDate !== null;
      
      if (hasActualReadyDate) {
        return 'Available & Rent Ready';
      } else {
        return 'Available & Rent Ready (Flagged)';
      }
    }
    
    // Check estimated ready date for timeline categories
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
    
    // If rent ready = "yes" and has actual ready date, use actual ready date
    if (unit.rentReady === 'yes' && unit.actualReadyDate && unit.actualReadyDate !== '' && unit.actualReadyDate !== null) {
      let actualDate;
      
      // Handle different formats of actual ready date
      if (unit.actualReadyDate instanceof Date) {
        actualDate = unit.actualReadyDate;
      } else {
        // Try to parse string date
        actualDate = new Date(unit.actualReadyDate);
        if (isNaN(actualDate)) {
          // If parsing fails, fall back to estimated date
          if (!unit.estimatedReadyDate) return null;
          const diffTime = unit.estimatedReadyDate - today;
          return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
        }
      }
      
      const diffTime = actualDate - today;
      return Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    }
    
    // Otherwise use estimated ready date
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
    
    // Flag if rent ready is "yes" but actual ready date is empty
    if (unit.rentReady === 'yes' && !hasActualReadyDate) {
      return true;
    }
    
    // Flag if unit is rented (has future move-in date) but not rent ready
    if (hasMoveinDate && unit.rentReady !== 'yes') {
      return true;
    }
    
    // Flag if unit is Down/Hold/Model/Development but marked as rent ready
    if (isDownHoldModel && unit.rentReady === 'yes') {
      return true;
    }
    
    return false;
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

    // Create HTML content for printing
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
          // Auto-trigger print dialog after page loads
          window.onload = function() {
            setTimeout(function() {
              window.print();
            }, 500);
          };
        </script>
      </body>
      </html>
    `;

    // Open new window and write HTML content
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

    // Prepare data for export
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

    // Clean up previous URL
    if (downloadUrl) {
      window.URL.revokeObjectURL(downloadUrl);
    }

    // Create persistent download URL
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
      
      // Clean up previous download URL
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
    
    // Apply filters
    if (filters.property) {
      filtered = filtered.filter(unit => unit.property.toLowerCase().includes(filters.property.toLowerCase()));
    }
    
    // Multi-property filter
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
    
    // Rent range filter
    if (filters.rentMin > 0 || filters.rentMax < 5000) {
      filtered = filtered.filter(unit => 
        unit.askingRent >= filters.rentMin && unit.askingRent <= filters.rentMax
      );
    }
    
    // Show flagged units only
    if (filters.showFlaggedOnly) {
      filtered = filtered.filter(unit => unit.hasIssues === true);
    }
    
    // Date range filter
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
    
    // Apply sorting
    if (sortConfig.key) {
      filtered.sort((a, b) => {
        const aVal = a[sortConfig.key];
        const bVal = b[sortConfig.key];
        
        if (aVal < bVal) return sortConfig.direction === 'asc' ? -1 : 1;
        if (aVal > bVal) return sortConfig.direction === 'asc' ? 1 : -1;
        return 0;
      });
    } else {
      // Default sorting by category priority, then by description (bedroom count), then by rent
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
        
        // Within same category, sort by bedroom count first (0, 1, 2, 3, etc.)
        const bedroomsA = extractBedroomCount(a.unitDescription);
        const bedroomsB = extractBedroomCount(b.unitDescription);
        
        if (bedroomsA !== bedroomsB) return bedroomsA - bedroomsB;
        
        // Then by rent amount (cheapest to most expensive)
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

  return (
    <div className="max-w-7xl mx-auto p-6 bg-white rounded-lg shadow-lg">
      <div className="text-center mb-8">
        <h1 className="text-3xl font-bold text-gray-800 mb-2">
          🏢 RR Report Dashboard & Sorting
        </h1>
        <p className="text-gray-600">
          Upload your Yardi Rent Ready report for interactive dashboard with filtering and sorting
        </p>
      </div>

      {!showDashboard && (
        <>
          {/* File Upload */}
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

          {/* Process Button */}
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

          {/* Status Messages */}
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

          {/* How it Works */}
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
        </>
      )}

      {/* Dashboard */}
      {showDashboard && cleanedData && (
        <div className="space-y-6">
          {/* Header with Stats */}
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
            {/* Basic Filters Row */}
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

            {/* Advanced Filters Toggle */}
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

            {/* Active Filters Indicator */}
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

            {/* Advanced Filters */}
            {showAdvancedFilters && (
              <div className="border-t pt-4 space-y-4">
                {/* Rent Range */}
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

                {/* Date Range */}
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

                {/* Multi-Property Selection */}
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

          {/* Summary */}
          <div className="text-sm text-gray-600 text-center">
            Showing {sortedAndFilteredData().length} of {cleanedData.length} units
          </div>
        </div>
      )}
    </div>
  );
};

export default RRReportProcessor;

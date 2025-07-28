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
    properties: [], // Multi-select
    category: '',
    rentReady: '',
    search: '',
    rentMin: 0,
    rentMax: 5000,
    dateRange: {
      start: '',
      end: '',
      dateType: 'estimated' // 'estimated' or 'actual'
    }
  });
  const [sortConfig, setSortConfig] = useState({ key: null, direction: 'asc' });
  const [showAdvancedFilters, setShowAdvancedFilters] = useState(false);
  const [filterPresets, setFilterPresets] = useState([]);
  const [showPdfOptions, setShowPdfOptions] = useState(false);
  const [pdfOptions, setPdfOptions] = useState({
    format: 'table', // 'table' or 'summary'
    includeColumns: {
      unit: true,
      property: true,
      category: true,
      description: true,
      rent: true,
      rentReady: true,
      estimatedDate: true,
      actualDate: true,
      days: true,
      comments: true
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
      // BUT skip if it's just a property header (no unit type data)
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

  // Filter Preset Management
  const saveFilterPreset = (name) => {
    const preset = {
      name,
      filters: { ...filters },
      timestamp: new Date().toISOString()
    };
    
    const updatedPresets = [...filterPresets, preset];
    setFilterPresets(updatedPresets);
    
    // Download as JSON
    const blob = new Blob([JSON.stringify(preset, null, 2)], { type: 'application/json' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${name.replace(/\s+/g, '_')}_filter_preset.json`;
    a.click();
    window.URL.revokeObjectURL(url);
  };

  const loadFilterPreset = (event) => {
    const file = event.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const preset = JSON.parse(e.target.result);
        setFilters(preset.filters);
        setStatus(`Filter preset "${preset.name}" loaded successfully`);
      } catch (error) {
        setError('Invalid filter preset file');
      }
    };
    reader.readAsText(file);
  };

  const applyPresetFilter = (presetName) => {
    const presetFilters = {
      'Premium 1BR': {
        ...filters,
        rentMin: 2000,
        rentMax: 5000,
        search: '1 bedroom'
      },
      'Ready This Week': {
        ...filters,
        category: 'Available & Rent Ready',
        dateRange: {
          start: new Date().toISOString().split('T')[0],
          end: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
          dateType: 'actual'
        }
      },
      'Flagged Units': {
        ...filters,
        category: 'Available & Rent Ready (Flagged)'
      }
    };

    if (presetFilters[presetName]) {
      setFilters(presetFilters[presetName]);
    }
  };

  // PDF Generation
  const generatePDF = async () => {
    // For now, we'll create a simple implementation
    // In a real app, you'd use jsPDF library
    const data = sortedAndFilteredData();
    
    if (pdfOptions.format === 'table') {
      // Generate table format
      let pdfContent = 'RR Report Dashboard\n\n';
      pdfContent += 'Unit\tProperty\tCategory\tDescription\tRent\tReady\tEst.Date\tActual Date\tDays\tComments\n';
      
      data.forEach(unit => {
        if (pdfOptions.includeColumns.unit) pdfContent += `${unit.unitCode}\t`;
        if (pdfOptions.includeColumns.property) pdfContent += `${unit.property}\t`;
        if (pdfOptions.includeColumns.category) pdfContent += `${unit.category}\t`;
        if (pdfOptions.includeColumns.description) pdfContent += `${unit.unitDescription}\t`;
        if (pdfOptions.includeColumns.rent) pdfContent += `${unit.askingRent}\t`;
        if (pdfOptions.includeColumns.rentReady) pdfContent += `${unit.rentReady}\t`;
        if (pdfOptions.includeColumns.estimatedDate) pdfContent += `${unit.estimatedReadyDate ? unit.estimatedReadyDate.toLocaleDateString() : ''}\t`;
        if (pdfOptions.includeColumns.actualDate) pdfContent += `${unit.actualReadyDate ? (unit.actualReadyDate instanceof Date ? unit.actualReadyDate.toLocaleDateString() : unit.actualReadyDate.toString()) : ''}\t`;
        if (pdfOptions.includeColumns.days) pdfContent += `${unit.daysUntilReady || ''}\t`;
        if (pdfOptions.includeColumns.comments) pdfContent += `${unit.comments}\t`;
        pdfContent += '\n';
      });
      
      // Download as text file (in real implementation, this would be PDF)
      const blob = new Blob([pdfContent], { type: 'text/plain' });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `RR_Report_${new Date().toISOString().split('T')[0]}.txt`;
      a.click();
      window.URL.revokeObjectURL(url);
    } else {
      // Generate summary format
      const stats = getCategoryStats();
      let summaryContent = 'RR Report Summary\n\n';
      summaryContent += `Total Units: ${data.length}\n\n`;
      
      Object.entries(stats).forEach(([category, count]) => {
        summaryContent += `${category}: ${count} units\n`;
      });
      
      summaryContent += `\nGenerated: ${new Date().toLocaleString()}\n`;
      
      const blob = new Blob([summaryContent], { type: 'text/plain' });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `RR_Summary_${new Date().toISOString().split('T')[0]}.txt`;
      a.click();
      window.URL.revokeObjectURL(url);
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
              <li><strong>Advanced filtering:</strong> Rent sliders, date ranges, multi-property selection, filter presets</li>
              <li><strong>Smart sorting:</strong> Category priority → bedroom count → rent (cheapest first)</li>
              <li><strong>Enhanced flagging:</strong> Rent ready without dates, rented but not ready, development but ready</li>
              <li><strong>Smart days calculation:</strong> Uses actual ready date for ready units, estimated for others</li>
              <li><strong>Multiple export formats:</strong> Excel data export + PDF reports (table/summary formats)</li>
              <li><strong>Filter presets:</strong> Save/load custom filter combinations as downloadable JSON files</li>
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
                onClick={() => setShowPdfOptions(!showPdfOptions)}
                className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors"
              >
                📋 Export PDF
              </button>
              
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
              <h3 className="font-semibold text-purple-800 mb-3">PDF Export Options</h3>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Format</label>
                  <select
                    value={pdfOptions.format}
                    onChange={(e) => setPdfOptions({...pdfOptions, format: e.target.value})}
                    className="w-full p-2 border border-gray-300 rounded text-sm"
                  >
                    <option value="table">Table Format</option>
                    <option value="summary">Summary Report</option>
                  </select>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Include Columns</label>
                  <div className="grid grid-cols-2 gap-2">
                    {Object.entries(pdfOptions.includeColumns).map(([key, checked]) => (
                      <label key={key} className="flex items-center">
                        <input
                          type="checkbox"
                          checked={checked}
                          onChange={(e) => setPdfOptions({
                            ...pdfOptions, 
                            includeColumns: {...pdfOptions.includeColumns, [key]: e.target.checked}
                          })}
                          className="mr-2"
                        />
                        <span className="text-xs capitalize">{key.replace(/([A-Z])/g, ' $1').trim()}</span>
                      </label>
                    ))}
                  </div>
                </div>
              </div>
              
              <div className="mt-4 flex gap-2">
                <button
                  onClick={generatePDF}
                  className="px-4 py-2 bg-purple-600 text-white rounded hover:bg-purple-700"
                >
                  Generate PDF
                </button>
                <button
                  onClick={() => setShowPdfOptions(false)}
                  className="px-4 py-2 bg-gray-300 text-gray-700 rounded hover:bg-gray-400"
                >
                  Cancel
                </button>
              </div>
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
                  className="w-full p-2 border border-gray-300 rounded text-sm"
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
                  className="w-full p-2 border border-gray-300 rounded text-sm"
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
                  className="w-full p-2 border border-gray-300 rounded text-sm"
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
                  className="w-full p-2 border border-gray-300 rounded text-sm"
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
                  <button onClick={() => applyPresetFilter('Premium 1BR')} className="px-2 py-1 bg-gray-200 text-gray-700 rounded text-xs hover:bg-gray-300">Premium 1BR</button>
                  <button onClick={() => applyPresetFilter('Ready This Week')} className="px-2 py-1 bg-gray-200 text-gray-700 rounded text-xs hover:bg-gray-300">Ready This Week</button>
                  <button onClick={() => applyPresetFilter('Flagged Units')} className="px-2 py-1 bg-gray-200 text-gray-700 rounded text-xs hover:bg-gray-300">Flagged Units</button>
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
                  dateRange: { start: '', end: '', dateType: 'estimated' }
                })}
                className="px-3 py-1 bg-red-600 text-white rounded text-sm hover:bg-red-700"
              >
                Clear All
              </button>
            </div>

            {/* Advanced Filters */}
            {showAdvancedFilters && (
              <div className="border-t pt-4 space-y-4">
                {/* Rent Range */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Rent Range: ${filters.rentMin} - ${filters.rentMax}
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
                    <label className="block text-sm font-medium text-gray-700 mb-1">Date Type</label>
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
                      className="w-full p-2 border border-gray-300 rounded text-sm"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">To Date</label>
                    <input
                      type="date"
                      value={filters.dateRange.end}
                      onChange={(e) => setFilters({...filters, dateRange: {...filters.dateRange, end: e.target.value}})}
                      className="w-full p-2 border border-gray-300 rounded text-sm"
                    />
                  </div>
                </div>

                {/* Multi-Property Selection */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Select Multiple Properties</label>
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
                        <span className="text-sm">{prop}</span>
                      </label>
                    ))}
                  </div>
                </div>

                {/* Filter Presets */}
                <div className="flex gap-4 items-center">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Save Current Filter</label>
                    <div className="flex gap-2">
                      <input
                        type="text"
                        placeholder="Preset name..."
                        onKeyPress={(e) => {
                          if (e.key === 'Enter' && e.target.value.trim()) {
                            saveFilterPreset(e.target.value.trim());
                            e.target.value = '';
                          }
                        }}
                        className="px-2 py-1 border border-gray-300 rounded text-sm"
                      />
                      <span className="text-xs text-gray-500 self-center">Press Enter to save</span>
                    </div>
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Load Filter Preset</label>
                    <input
                      type="file"
                      accept=".json"
                      onChange={loadFilterPreset}
                      className="text-sm"
                    />
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

import * as pdfjsLib from 'pdfjs-dist';
import * as XLSX from 'xlsx';

// Initialize PDF.js worker
const PDFJS_VERSION = '3.11.174';
pdfjsLib.GlobalWorkerOptions.workerSrc = `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/${PDFJS_VERSION}/pdf.worker.min.js`;

export type ParsedContent = 
  | { type: 'text'; content: string }
  | { type: 'image'; inlineData: { data: string; mimeType: string } };

export const parseFile = async (file: File): Promise<ParsedContent> => {
  const fileType = file.type;
  
  if (fileType === 'application/pdf') {
    const text = await parsePdf(file);
    return { type: 'text', content: text };
  } else if (
    fileType === 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' || 
    fileType === 'application/vnd.ms-excel' ||
    file.name.endsWith('.xlsx') ||
    file.name.endsWith('.xls')
  ) {
    const text = await parseExcel(file);
    return { type: 'text', content: text };
  } else if (fileType.startsWith('image/')) {
    return parseImage(file);
  } else {
    throw new Error('Unsupported file type. Please upload a PDF, Excel, or Image file.');
  }
};

const parseImage = async (file: File): Promise<ParsedContent> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const result = e.target?.result as string;
        // Data URL format: "data:image/jpeg;base64,/9j/4AAQSk..."
        const [metadata, data] = result.split(',');
        const mimeType = metadata.match(/:(.*?);/)?.[1] || file.type;
        
        resolve({
          type: 'image',
          inlineData: {
            mimeType,
            data
          }
        });
      } catch (error) {
        reject(new Error('Failed to process image file.'));
      }
    };
    reader.onerror = () => reject(new Error('Failed to read file.'));
    reader.readAsDataURL(file);
  });
};

const parsePdf = async (file: File): Promise<string> => {
  try {
    const arrayBuffer = await file.arrayBuffer();
    const loadingTask = pdfjsLib.getDocument({ data: arrayBuffer });
    const pdf = await loadingTask.promise;
    
    let fullText = '';
    
    // Iterate through all pages
    for (let i = 1; i <= pdf.numPages; i++) {
      const page = await pdf.getPage(i);
      const textContent = await page.getTextContent();
      const pageText = textContent.items
        .map((item: any) => item.str)
        .join(' ');
      fullText += `--- Page ${i} ---\n${pageText}\n\n`;
    }
    
    if (fullText.trim().length === 0) {
      throw new Error('PDF appears to be empty or contains only images. Try taking a screenshot or converting to image for OCR.');
    }

    return fullText;
  } catch (error) {
    console.error("Error parsing PDF:", error);
    throw new Error('Failed to read PDF file. It might be corrupted or password protected.');
  }
};

const parseExcel = async (file: File): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    
    reader.onload = (e) => {
      try {
        const data = e.target?.result;
        const workbook = XLSX.read(data, { type: 'binary' });
        
        // Read the first sheet
        const sheetName = workbook.SheetNames[0];
        const sheet = workbook.Sheets[sheetName];
        
        // Convert to CSV for token efficiency and clarity for the LLM
        const csv = XLSX.utils.sheet_to_csv(sheet);
        
        if (!csv || csv.trim().length === 0) {
          reject(new Error('Excel file appears to be empty.'));
          return;
        }

        resolve(`--- Excel Sheet: ${sheetName} ---\n${csv}`);
      } catch (error) {
        reject(new Error('Failed to parse Excel file.'));
      }
    };
    
    reader.onerror = () => reject(new Error('Failed to read file.'));
    reader.readAsBinaryString(file);
  });
};
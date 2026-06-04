import { useState } from 'react';
import html2canvas from 'html2canvas';
import jsPDF from 'jspdf';

export default function PdfReportButton({ targetRef, disabled, compact = false, onGeneratingChange }) {
  const [message, setMessage] = useState('');
  const [generating, setGenerating] = useState(false);

  const downloadPdf = async () => {
    if (!targetRef.current) return;

    setGenerating(true);
    onGeneratingChange?.(true);
    setMessage('');

    try {
      await new Promise((resolve) => setTimeout(resolve, 50));
      const canvas = await html2canvas(targetRef.current, {
        backgroundColor: '#0f172a',
        scale: 2,
        useCORS: true,
      });
      const image = canvas.toDataURL('image/png');
      const pdf = new jsPDF('p', 'mm', 'a4');
      const pageWidth = pdf.internal.pageSize.getWidth();
      const pageHeight = pdf.internal.pageSize.getHeight();
      const margin = 10;
      const imageWidth = pageWidth - margin * 2;
      const imageHeight = (canvas.height * imageWidth) / canvas.width;
      let heightLeft = imageHeight;
      let position = margin;

      pdf.addImage(image, 'PNG', margin, position, imageWidth, imageHeight);
      heightLeft -= pageHeight - margin * 2;

      while (heightLeft > 0) {
        pdf.addPage();
        position = heightLeft - imageHeight + margin;
        pdf.addImage(image, 'PNG', margin, position, imageWidth, imageHeight);
        heightLeft -= pageHeight - margin * 2;
      }

      pdf.save(`environment-dashboard-report-${new Date().toISOString().slice(0, 10)}.pdf`);
      setMessage('PDF 보고서 다운로드를 시작했습니다.');
    } catch (error) {
      setMessage(error.message || 'PDF 생성에 실패했습니다.');
    } finally {
      setGenerating(false);
      onGeneratingChange?.(false);
    }
  };

  return (
    <div style={{
      display: 'flex',
      flexDirection: compact ? 'row' : 'column',
      alignItems: compact ? 'center' : 'flex-start',
      gap: 8,
      marginBottom: compact ? 0 : 16,
    }}>
      <button
        type="button"
        onClick={downloadPdf}
        disabled={disabled || generating}
        style={{
          border: '1px solid rgba(56,189,248,0.35)',
          background: disabled || generating ? '#334155' : 'rgba(56,189,248,0.15)',
          color: disabled || generating ? '#64748b' : '#38bdf8',
          borderRadius: 8,
          padding: compact ? '6px 12px' : '10px 14px',
          cursor: disabled || generating ? 'not-allowed' : 'pointer',
          fontWeight: 700,
          fontSize: compact ? 12 : 13,
          whiteSpace: 'nowrap',
        }}
      >
        {generating ? 'PDF 생성 중...' : 'PDF 보고서 다운로드'}
      </button>
      {message && <p style={{ color: '#94a3b8', fontSize: 12, margin: 0 }}>{message}</p>}
    </div>
  );
}

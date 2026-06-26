// FILE: client/src/components/transfers/CertificateModal.jsx
import { useState, useEffect, useRef } from 'react';
import api from '../../utils/api';
import Modal from '../ui/Modal';
import Button from '../ui/Button';
import { formatDate, formatDateTime } from '../../utils/helpers';
import { FileText, Printer, Loader2 } from 'lucide-react';

export default function CertificateModal({ transfer, onClose }) {
  const [cert, setCert]         = useState(null);
  const [loading, setLoading]   = useState(true);
  const [generating, setGenerating] = useState(false);
  const [error, setError]       = useState('');
  const printRef                = useRef();

  useEffect(() => {
    api.get(`/certificates/${transfer.id}`)
      .then(r => { if (r.data.data) setCert(r.data.data); })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [transfer.id]);

  const generateCert = async () => {
    setGenerating(true);
    setError('');
    try {
      const res = await api.post('/certificates/generate', { transfer_id: transfer.id });
      setCert(res.data.data);
    } catch (e) {
      setError(e.response?.data?.error || 'Failed to generate certificate.');
    } finally {
      setGenerating(false);
    }
  };

  const handlePrint = () => {
    const content = printRef.current.innerHTML;
    const win = window.open('', '_blank');
    win.document.write(`
      <html><head><title>Synapse Transfer Certificate — ${cert?.certificate_number}</title>
      <style>
        * { box-sizing: border-box; margin: 0; padding: 0; }
        body { font-family: Arial, sans-serif; padding: 40px; color: #111; background: #fff; }
        .header { text-align: center; padding-bottom: 20px; margin-bottom: 24px; border-bottom: 3px double #000; }
        .logo { font-size: 30px; font-weight: 900; letter-spacing: 6px; color: #000; }
        .subtitle { font-size: 11px; color: #666; letter-spacing: 3px; margin: 4px 0 12px; }
        .cert-title { font-size: 16px; font-weight: bold; text-transform: uppercase; letter-spacing: 2px; }
        .cert-num { font-size: 13px; color: #1a56db; margin-top: 6px; font-weight: bold; }
        .issued { font-size: 11px; color: #888; margin-top: 4px; }
        .verified { background: #dcfce7; color: #166534; padding: 3px 12px; border-radius: 20px; font-size: 11px; font-weight: bold; border: 1px solid #86efac; display:inline-block; margin-top:8px; }
        .section { margin: 20px 0; }
        .section-label { font-size: 10px; font-weight: bold; color: #555; text-transform: uppercase; letter-spacing: 1.5px; border-bottom: 1px solid #ddd; padding-bottom: 5px; margin-bottom: 12px; }
        .two-col { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; }
        .box { border: 1px solid #e5e7eb; border-radius: 6px; padding: 12px; }
        .field-label { font-size: 10px; color: #888; text-transform: uppercase; margin-bottom: 2px; }
        .field-value { font-size: 13px; font-weight: 600; color: #111; }
        .field-sub { font-size: 11px; color: #555; margin-top: 1px; }
        .four-col { display: grid; grid-template-columns: 1fr 1fr 1fr 1fr; gap: 12px; }
        .finance-box { background: #f9fafb; border: 1px solid #e5e7eb; border-radius: 6px; padding: 14px; }
        .fin-row { display: flex; justify-content: space-between; padding: 5px 0; font-size: 13px; border-bottom: 1px solid #f3f4f6; }
        .fin-row:last-child { border-bottom: none; font-weight: bold; font-size: 14px; border-top: 2px solid #111; margin-top: 6px; padding-top: 8px; }
        .signatures { display: grid; grid-template-columns: 1fr 1fr; gap: 60px; margin-top: 60px; }
        .sig { text-align: center; border-top: 1px solid #000; padding-top: 8px; }
        .sig-name { font-size: 12px; font-weight: bold; }
        .sig-role { font-size: 10px; color: #666; }
        .footer { text-align: center; margin-top: 30px; font-size: 10px; color: #aaa; }
        @media print { body { padding: 20px; } }
      </style></head>
      <body>${content}</body></html>
    `);
    win.document.close();
    setTimeout(() => win.print(), 500);
  };

  // Render certificate content (used both in modal preview and print)
  const renderCert = (c) => (
    <div>
      {/* Header */}
      <div className="header">
        <div className="logo">SYNAPSE</div>
        <div className="subtitle">INTER-HOSPITAL ONCOLOGY DRUG EXCHANGE</div>
        <div className="cert-title">Drug Transfer Certificate</div>
        <div className="cert-num">Certificate No: {c.certificate_number}</div>
        <div className="issued">Issued: {formatDateTime(c.issued_at || c.created_at)}</div>
        <div className="verified">✓ VERIFIED TRANSFER</div>
      </div>

      {/* Parties */}
      <div className="section">
        <div className="section-label">Transfer Parties</div>
        <div className="two-col">
          <div className="box">
            <div className="field-label">Providing Hospital (Transferor)</div>
            <div className="field-value">{c.providing_name}</div>
            <div className="field-sub">{c.providing_city}, {c.providing_state}</div>
            <div className="field-sub">License: {c.providing_license}</div>
            {c.providing_address && <div className="field-sub">{c.providing_address}</div>}
          </div>
          <div className="box">
            <div className="field-label">Requesting Hospital (Transferee)</div>
            <div className="field-value">{c.requesting_name}</div>
            <div className="field-sub">{c.requesting_city}, {c.requesting_state}</div>
            <div className="field-sub">License: {c.requesting_license}</div>
            {c.requesting_address && <div className="field-sub">{c.requesting_address}</div>}
          </div>
        </div>
      </div>

      {/* Drug Details */}
      <div className="section">
        <div className="section-label">Drug / Medicine Details</div>
        <div className="four-col">
          <div><div className="field-label">Drug Name</div><div className="field-value">{c.drug_name}</div></div>
          <div><div className="field-label">Generic Name</div><div className="field-value">{c.generic_name || '—'}</div></div>
          <div><div className="field-label">Manufacturer</div><div className="field-value">{c.manufacturer || '—'}</div></div>
          <div><div className="field-label">Batch Number</div><div className="field-value">{c.batch_number}</div></div>
          <div><div className="field-label">Quantity</div><div className="field-value" style={{color:'#1a56db'}}>{c.quantity} {c.unit}</div></div>
          <div><div className="field-label">Expiry Date</div><div className="field-value">{formatDate(c.expiry_date)}</div></div>
          <div><div className="field-label">Unit Price</div><div className="field-value">₹{parseFloat(c.unit_price || 0).toFixed(2)}</div></div>
          {c.form10_number && <div><div className="field-label">Form 10 No.</div><div className="field-value">{c.form10_number}</div></div>}
        </div>
      </div>

      {/* Financial */}
      <div className="section">
        <div className="section-label">Financial Summary</div>
        <div className="finance-box">
          <div className="fin-row"><span>Sub Total ({c.quantity} × ₹{parseFloat(c.unit_price||0).toFixed(2)})</span><span>₹{parseFloat(c.subtotal||0).toFixed(2)}</span></div>
          <div className="fin-row"><span>GST @ 5%</span><span>₹{parseFloat(c.gst_amount||0).toFixed(2)}</span></div>
          <div className="fin-row"><span>Total Value</span><span>₹{parseFloat(c.total_value||0).toFixed(2)}</span></div>
        </div>
      </div>

      {/* Signatures */}
      <div className="signatures">
        <div className="sig">
          <div className="sig-name">{c.providing_name}</div>
          <div className="sig-role">Authorized Signatory — Transferor</div>
        </div>
        <div className="sig">
          <div className="sig-name">{c.requesting_name}</div>
          <div className="sig-role">Authorized Signatory — Transferee</div>
        </div>
      </div>

      <div className="footer">
        This certificate was digitally generated by Synapse Health Technologies Pvt. Ltd.<br />
        Verify at: synapsehealth.in/verify/{c.certificate_number}
      </div>
    </div>
  );

  return (
    <Modal title="Transfer Certificate" onClose={onClose} size="xl">
      {loading ? (
        <div className="flex items-center justify-center py-12 gap-2 text-synapse-muted">
          <Loader2 size={18} className="animate-spin" /> Loading...
        </div>
      ) : !cert ? (
        <div className="text-center py-12 space-y-4">
          <div className="w-16 h-16 rounded-full bg-yellow-500/10 border border-yellow-500/30 flex items-center justify-center mx-auto">
            <FileText size={28} className="text-yellow-400" />
          </div>
          <div>
            <div className="text-synapse-text font-display font-semibold mb-1">Generate Transfer Certificate</div>
            <div className="text-synapse-muted text-sm">
              Create an official certificate for this transfer including drug details, hospital info, and GST invoice.
            </div>
          </div>
          {error && <div className="text-red-400 text-sm p-3 bg-red-500/10 border border-red-500/30 rounded-lg">{error}</div>}
          <Button onClick={generateCert} loading={generating} variant="primary">
            <FileText size={14} />
            {generating ? 'Generating...' : 'Generate Certificate'}
          </Button>
        </div>
      ) : (
        <div className="space-y-4">
          <div className="flex justify-between items-center">
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-green-400" />
              <span className="text-xs text-green-400 font-mono">{cert.certificate_number}</span>
            </div>
            <Button variant="outline" size="sm" onClick={handlePrint}>
              <Printer size={13} /> Print / Save PDF
            </Button>
          </div>

          {/* Preview */}
          <div ref={printRef}
            className="bg-white text-gray-900 rounded-xl border border-gray-200 p-8 text-sm overflow-auto max-h-[60vh]"
            style={{ fontFamily: 'Arial, sans-serif' }}
          >
            {renderCert(cert)}
          </div>
        </div>
      )}
    </Modal>
  );
}

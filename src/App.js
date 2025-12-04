import React, { useState, useEffect, useRef } from 'react';
import { 
  Camera, Save, FileSpreadsheet, Plus, Search as SearchIcon, Filter, 
  CheckCircle, XCircle, Clock, Truck, User, Package, Calendar, Menu, 
  X, PenTool, Download, Image as ImageIcon, Table as TableIcon, 
  ClipboardList, Settings, Trash2, Edit, Database, Lock, LogOut, 
  UserPlus, Upload, ChevronRight
} from 'lucide-react';
import { initializeApp } from 'firebase/app';
import { 
  getAuth, signInWithCustomToken, signInAnonymously, onAuthStateChanged 
} from 'firebase/auth';
import { 
  getFirestore, collection, addDoc, query, onSnapshot, orderBy, 
  updateDoc, deleteDoc, doc, serverTimestamp, where, setDoc, getDoc 
} from 'firebase/firestore';

// --- CONFIGURATION ---

// 1. YOUR GOOGLE APPS SCRIPT URL
const GOOGLE_SCRIPT_URL = "https://script.google.com/macros/s/AKfycbyoEq00QQ9frYqccma_alfnYSxVqdhnPteoX6zJc96efyk2bmjzVH8EE1_Jau0S6yY14g/exec"; 

// 2. YOUR FIREBASE CONFIG
const firebaseConfig = {
  apiKey: "AIzaSyAwwKxHOt8tjH71geRRzFpIaAS0uItPqYg",
  authDomain: "ti---inward.firebaseapp.com",
  projectId: "ti---inward",
  storageBucket: "ti---inward.firebasestorage.app",
  messagingSenderId: "124004649762",
  appId: "1:124004649762:web:67197eb52782ac6d33f37b",
  measurementId: "G-SBP0W9C0N1"
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);
const appId = 'tirthindustries-inward';

// --- UI Constants ---
const COLORS = {
  primary: "bg-red-700",
  primaryHover: "hover:bg-red-800",
  secondary: "bg-yellow-500", 
  secondaryHover: "hover:bg-yellow-600",
  accent: "text-red-700",
  lightBg: "bg-red-50",
  border: "border-red-200"
};

// --- Helper Components ---
const Card = ({ children, className = "" }) => (
  <div className={`bg-white rounded-xl shadow-lg border border-gray-100 overflow-hidden ${className}`}>
    {children}
  </div>
);

const Button = ({ children, onClick, variant = "primary", className = "", type = "button", disabled = false }) => {
  const baseStyle = "px-4 py-3 rounded-xl font-bold transition-all transform active:scale-95 flex items-center justify-center gap-2 shadow-sm";
  const variants = {
    primary: `${COLORS.primary} text-white ${COLORS.primaryHover} shadow-red-200`,
    secondary: "bg-white text-gray-700 border border-gray-200 hover:bg-gray-50",
    success: "bg-green-600 text-white hover:bg-green-700",
    danger: "bg-red-100 text-red-700 hover:bg-red-200",
    brand: `${COLORS.secondary} text-white ${COLORS.secondaryHover} shadow-yellow-200`
  };
  return (
    <button 
      type={type} onClick={onClick} className={`${baseStyle} ${variants[variant]} ${className} disabled:opacity-50 disabled:cursor-not-allowed`} disabled={disabled}
    >
      {children}
    </button>
  );
};

const InputGroup = ({ label, children, className="" }) => (
  <div className={`mb-5 ${className}`}>
    <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1.5 ml-1">{label}</label>
    {children}
  </div>
);

// --- Main Application Component ---
export default function App() {
  const [firebaseUser, setFirebaseUser] = useState(null);
  // AUTO LOGIN ENABLED: Starts as true
  const [isAppLoggedIn, setIsAppLoggedIn] = useState(true);
  // DEFAULT USER: System Admin
  const [currentUser, setCurrentUser] = useState({ username: 'admin', role: 'admin', name: 'System Admin' });
  const [view, setView] = useState('entry');
  const [loading, setLoading] = useState(true);

  // Data State
  const [entries, setEntries] = useState([]);
  const [clients, setClients] = useState([]);
  const [products, setProducts] = useState([]);
  const [appUsers, setAppUsers] = useState([]);
  const [appLogo, setAppLogo] = useState(null);

  // Auth Initialization
  useEffect(() => {
    const initAuth = async () => {
      try {
        if (typeof __initial_auth_token !== 'undefined' && __initial_auth_token) {
          try { await signInWithCustomToken(auth, __initial_auth_token); } 
          catch (e) { await signInAnonymously(auth); }
        } else { await signInAnonymously(auth); }
      } catch (error) { console.error("Auth error:", error); }
    };
    initAuth();
    const unsubscribe = onAuthStateChanged(auth, (u) => {
      setFirebaseUser(u);
      setLoading(false);
    });
    return () => unsubscribe();
  }, []);

  // Data Listeners
  useEffect(() => {
    if (!firebaseUser) return;

    const unsubSettings = onSnapshot(doc(db, 'artifacts', appId, 'public', 'data', 'settings', 'global'), (doc) => {
      if (doc.exists()) setAppLogo(doc.data().logo);
    });

    const unsubClients = onSnapshot(query(collection(db, 'artifacts', appId, 'public', 'data', 'clients')), (snapshot) => {
      const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      data.sort((a, b) => a.name.localeCompare(b.name));
      setClients(data);
      if (data.length === 0) seedDefaults();
    });

    const unsubProducts = onSnapshot(query(collection(db, 'artifacts', appId, 'public', 'data', 'products')), (snapshot) => {
      const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      data.sort((a, b) => a.name.localeCompare(b.name));
      setProducts(data);
    });

    const unsubUsers = onSnapshot(query(collection(db, 'artifacts', appId, 'public', 'data', 'users')), (snapshot) => {
      const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setAppUsers(data);
      if (data.length === 0) seedDefaultUsers();
    });

    const unsubEntries = onSnapshot(query(collection(db, 'artifacts', appId, 'public', 'data', 'entries')), (snapshot) => {
      const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      data.sort((a, b) => {
        const tA = a.createdAt?.seconds || 0;
        const tB = b.createdAt?.seconds || 0;
        return tB - tA;
      });
      setEntries(data);
    });

    return () => {
      unsubSettings(); unsubClients(); unsubProducts(); unsubEntries(); unsubUsers();
    };
  }, [firebaseUser]);

  const seedDefaults = async () => {
    const defaultClients = ["Spice Traders Inc", "Global Foods Ltd", "Farm Fresh Co"];
    const defaultProducts = ["Turmeric", "Chili Powder", "Cumin Seeds", "Coriander"];
    for (const name of defaultClients) await addDoc(collection(db, 'artifacts', appId, 'public', 'data', 'clients'), { name });
    for (const name of defaultProducts) await addDoc(collection(db, 'artifacts', appId, 'public', 'data', 'products'), { name });
  };

  const seedDefaultUsers = async () => {
    await addDoc(collection(db, 'artifacts', appId, 'public', 'data', 'users'), { username: 'admin', password: '123', role: 'admin', name: 'System Admin' });
    await addDoc(collection(db, 'artifacts', appId, 'public', 'data', 'users'), { username: 'staff', password: '123', role: 'staff', name: 'Gate Staff' });
  };

  const AdminPanel = () => {
    const [activeTab, setActiveTab] = useState('clients');
    const [editId, setEditId] = useState(null);
    const [editValue, setEditValue] = useState('');
    const [newUserUser, setNewUserUser] = useState('');
    const [newUserPass, setNewUserPass] = useState('');
    const [newUserRole, setNewUserRole] = useState('staff');
    const [newUserName, setNewUserName] = useState('');

    const handleDelete = async (collectionName, id, name) => {
      if (window.confirm(`Delete "${name}"?`)) {
        await deleteDoc(doc(db, 'artifacts', appId, 'public', 'data', collectionName, id));
      }
    };

    const saveEdit = async (collectionName) => {
      if (!editValue.trim()) return;
      await updateDoc(doc(db, 'artifacts', appId, 'public', 'data', collectionName, editId), { name: editValue });
      setEditId(null); setEditValue('');
    };

    const handleAddUser = async (e) => {
      e.preventDefault();
      if (!newUserUser || !newUserPass || !newUserName) return;
      await addDoc(collection(db, 'artifacts', appId, 'public', 'data', 'users'), { username: newUserUser, password: newUserPass, role: newUserRole, name: newUserName });
      setNewUserUser(''); setNewUserPass(''); setNewUserName('');
    };

    const MasterList = ({ data, collectionName, title }) => (
      <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
        <div className="p-4 bg-gray-50 border-b flex justify-between items-center"><h3 className="font-bold text-gray-800">{title}</h3><span className="text-xs font-medium bg-white px-2 py-1 rounded border text-gray-500">{data.length} items</span></div>
        <div className="divide-y divide-gray-100 max-h-[50vh] overflow-y-auto">
          {data.map(item => (
            <div key={item.id} className="p-3 flex items-center justify-between hover:bg-gray-50 group">
              {editId === item.id ? (
                <div className="flex gap-2 flex-1 mr-2"><input className="flex-1 p-1 border rounded text-sm" value={editValue} onChange={(e) => setEditValue(e.target.value)} autoFocus /><button onClick={() => saveEdit(collectionName)} className="text-green-600"><CheckCircle size={18}/></button><button onClick={() => setEditId(null)} className="text-red-600"><X size={18}/></button></div>
              ) : ( <span className="text-sm font-medium text-gray-700">{item.name}</span> )}
              {editId !== item.id && ( <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity"><button onClick={() => { setEditId(item.id); setEditValue(item.name); }} className="text-blue-500"><Edit size={16}/></button><button onClick={() => handleDelete(collectionName, item.id, item.name)} className="text-red-500"><Trash2 size={16}/></button></div> )}
            </div>
          ))}
        </div>
      </div>
    );

    const UserManagement = () => (
      <div className="space-y-6">
         <div className="bg-white p-5 rounded-xl shadow-sm border border-gray-100">
            <h3 className="font-bold text-gray-800 mb-4 flex items-center gap-2 text-sm uppercase tracking-wide"><UserPlus size={18} className="text-red-600"/> Create New User</h3>
            <form onSubmit={handleAddUser} className="grid grid-cols-1 md:grid-cols-2 gap-4">
               <input placeholder="Name (e.g. Guard 1)" className="p-3 bg-gray-50 border rounded-lg text-sm" value={newUserName} onChange={e => setNewUserName(e.target.value)} required />
               <input placeholder="Login ID" className="p-3 bg-gray-50 border rounded-lg text-sm" value={newUserUser} onChange={e => setNewUserUser(e.target.value)} required />
               <input placeholder="Password" type="text" className="p-3 bg-gray-50 border rounded-lg text-sm" value={newUserPass} onChange={e => setNewUserPass(e.target.value)} required />
               <select className="p-3 bg-gray-50 border rounded-lg text-sm" value={newUserRole} onChange={e => setNewUserRole(e.target.value)}><option value="staff">Staff</option><option value="admin">Admin</option></select>
               <div className="md:col-span-2"><Button type="submit" variant="brand" className="w-full py-2">Create User Account</Button></div>
            </form>
         </div>
         <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
            <div className="p-4 bg-gray-50 border-b"><h3 className="font-bold text-gray-800 text-sm">Active Accounts</h3></div>
            <div className="divide-y divide-gray-100">
               {appUsers.map(u => (
                 <div key={u.id} className="p-4 flex items-center justify-between"><div><p className="font-bold text-gray-800 text-sm">{u.name}</p><p className="text-xs text-gray-500">@{u.username} • <span className="uppercase">{u.role}</span></p></div>{u.username !== 'admin' && <button onClick={() => handleDelete('users', u.id, u.username)} className="text-red-400 hover:text-red-600"><Trash2 size={18}/></button>}</div>
               ))}
            </div>
         </div>
      </div>
    );

    return (
      <div className="space-y-6 pb-24">
         <div className="flex items-center gap-3 mb-2 px-1"><div className="p-2 bg-red-100 rounded-lg text-red-700"><Settings size={20}/></div><div><h2 className="text-xl font-bold text-gray-800">Admin Controls</h2><p className="text-xs text-gray-500">System Configuration</p></div></div>
         <div className="flex gap-2 bg-gray-100 p-1 rounded-xl mb-4 overflow-x-auto">
           {['clients', 'products', 'users'].map(tab => (
             <button key={tab} onClick={() => setActiveTab(tab)} className={`flex-1 py-2 px-4 capitalize text-sm font-bold rounded-lg transition-all ${activeTab === tab ? 'bg-white text-red-600 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}>{tab}</button>
           ))}
         </div>
         {activeTab === 'clients' && <MasterList data={clients} collectionName="clients" title="Client List" />}
         {activeTab === 'products' && <MasterList data={products} collectionName="products" title="Product List" />}
         {activeTab === 'users' && <UserManagement />}
      </div>
    );
  };

  const EntryForm = () => {
    const [formData, setFormData] = useState({
      vehicleNo: '', clientName: '', productName: '', lotNo: '', bags: '', bagWeight: '',
      totalWeight: 0, transportCharges: '', transportMode: 'Client Transport', remarks: '',
      qcStatus: 'Pending', plateImage: null
    });
    
    const [isAddingClient, setIsAddingClient] = useState(false);
    const [newClientName, setNewClientName] = useState('');
    const [isAddingProduct, setIsAddingProduct] = useState(false);
    const [newProductName, setNewProductName] = useState('');
    const sigCanvas = useRef(null);
    const [hasSignature, setHasSignature] = useState(false);
    const [isDrawing, setIsDrawing] = useState(false);
    const [syncStatus, setSyncStatus] = useState(null); // 'success', 'error', 'loading'

    useEffect(() => {
      const bags = parseFloat(formData.bags) || 0;
      const weight = parseFloat(formData.bagWeight) || 0;
      setFormData(prev => ({ ...prev, totalWeight: bags * weight }));
    }, [formData.bags, formData.bagWeight]);

    const handleChange = (e) => setFormData(prev => ({ ...prev, [e.target.name]: e.target.value }));

    const handlePlateImage = (e) => {
      const file = e.target.files[0];
      if (file) {
        const reader = new FileReader();
        reader.onloadend = () => setFormData(prev => ({ ...prev, plateImage: reader.result }));
        reader.readAsDataURL(file);
      }
    };

    const syncToGoogleSheet = async (data) => {
        if (!GOOGLE_SCRIPT_URL) return;
        setSyncStatus('loading');
        try {
            // Create a text-only payload for the sheet
            const sheetPayload = {
                date: new Date().toLocaleDateString(),
                time: new Date().toLocaleTimeString(),
                vehicleNo: data.vehicleNo,
                client: data.clientName,
                product: data.productName,
                bags: data.bags,
                totalWeight: data.totalWeight,
                transportMode: data.transportMode,
                charges: data.transportCharges,
                lotNo: data.lotNo,
                remarks: data.remarks
            };
            
            await fetch(GOOGLE_SCRIPT_URL, {
                method: "POST",
                mode: "no-cors", // Crucial for Google Apps Script
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(sheetPayload)
            });
            setSyncStatus('success');
        } catch (error) {
            console.error("Sheet Sync Error", error);
            setSyncStatus('error');
        }
    };

    const handleSaveEntry = async (e) => {
      e.preventDefault();
      if (!firebaseUser) return;
      if (!formData.clientName || !formData.productName || !formData.vehicleNo) return alert("Missing required fields");

      try {
        let signatureData = null;
        if (hasSignature && sigCanvas.current) signatureData = sigCanvas.current.toDataURL();

        const entryData = {
          ...formData,
          signature: signatureData,
          createdAt: serverTimestamp(),
          createdBy: currentUser?.name || 'Unknown',
          dateString: new Date().toISOString().split('T')[0],
          entryCode: `IN-${Math.floor(Math.random() * 10000)}`
        };

        // 1. Save to Firebase
        await addDoc(collection(db, 'artifacts', appId, 'public', 'data', 'entries'), entryData);

        // 2. Sync to Google Sheets
        syncToGoogleSheet(entryData);

        setFormData({
          vehicleNo: '', clientName: '', productName: '', lotNo: '', bags: '', bagWeight: '',
          totalWeight: 0, transportCharges: '', transportMode: 'Client Transport', remarks: '',
          qcStatus: 'Pending', plateImage: null
        });
        clearSignature();
        alert("Entry Saved Successfully!");
        setView('dashboard');
      } catch (err) { 
        console.error("Error saving:", err);
        alert("Failed to save entry"); 
      }
    };

    // ... (rest of EntryForm master add handlers and signature logic same as before) ...
    const addNewClient = async () => { if (!newClientName) return; await addDoc(collection(db, 'artifacts', appId, 'public', 'data', 'clients'), { name: newClientName }); setFormData(prev => ({ ...prev, clientName: newClientName })); setIsAddingClient(false); };
    const addNewProduct = async () => { if (!newProductName) return; await addDoc(collection(db, 'artifacts', appId, 'public', 'data', 'products'), { name: newProductName }); setFormData(prev => ({ ...prev, productName: newProductName })); setIsAddingProduct(false); };
    const startDrawing = (e) => { const canvas = sigCanvas.current; const ctx = canvas.getContext('2d'); ctx.strokeStyle = '#000'; ctx.lineWidth = 2; const rect = canvas.getBoundingClientRect(); const x = (e.clientX || e.touches[0].clientX) - rect.left; const y = (e.clientY || e.touches[0].clientY) - rect.top; ctx.beginPath(); ctx.moveTo(x, y); setIsDrawing(true); };
    const draw = (e) => { if (!isDrawing) return; const canvas = sigCanvas.current; const ctx = canvas.getContext('2d'); const rect = canvas.getBoundingClientRect(); const x = (e.clientX || e.touches[0].clientX) - rect.left; const y = (e.clientY || e.touches[0].clientY) - rect.top; ctx.lineTo(x, y); ctx.stroke(); setHasSignature(true); };
    const stopDrawing = () => setIsDrawing(false);
    const clearSignature = () => { const canvas = sigCanvas.current; const ctx = canvas.getContext('2d'); ctx.clearRect(0, 0, canvas.width, canvas.height); setHasSignature(false); };

    return (
      <form onSubmit={handleSaveEntry} className="max-w-3xl mx-auto space-y-5 pb-24">
        <div className="flex items-center justify-between mb-2">
          <h2 className="text-xl font-bold text-gray-800">New Entry</h2>
          <span className="text-xs bg-red-100 text-red-700 px-3 py-1 rounded-full font-medium">{new Date().toLocaleDateString()}</span>
        </div>

        {/* Transport Section */}
        <Card className="p-5 border-l-4 border-l-red-600">
          <div className="flex items-center gap-2 mb-4 text-red-700 font-bold">
            <Truck size={20}/> <span>Transport Details</span>
          </div>
          
          <div className="flex flex-col md:flex-row gap-4 mb-4">
             <div className="flex-shrink-0">
                <label className="block text-xs font-bold text-gray-500 uppercase mb-1">Plate Photo</label>
                <div className="relative w-32 h-24 bg-gray-100 rounded-xl border-2 border-dashed border-gray-300 flex items-center justify-center overflow-hidden cursor-pointer hover:border-red-400 transition-colors">
                  {formData.plateImage ? (
                    <img src={formData.plateImage} alt="Plate" className="w-full h-full object-cover" />
                  ) : (
                    <div className="text-center p-2 text-gray-400">
                       <Camera className="mx-auto" size={24}/>
                       <span className="text-[10px] block mt-1 font-medium">Click to Snap</span>
                    </div>
                  )}
                  <input type="file" accept="image/*" capture="environment" onChange={handlePlateImage} className="absolute inset-0 opacity-0 cursor-pointer" />
                </div>
             </div>

             <div className="flex-grow">
               <InputGroup label="Vehicle Number *">
                 <input 
                   type="text" name="vehicleNo" required placeholder="GJ-XX-XXXX"
                   value={formData.vehicleNo} onChange={handleChange}
                   className="w-full p-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-2 focus:ring-red-500 uppercase h-[50px] text-xl font-mono font-bold tracking-wider text-gray-800"
                 />
               </InputGroup>
             </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <InputGroup label="Transport Mode">
              <select name="transportMode" value={formData.transportMode} onChange={handleChange} className="w-full p-3 bg-white border border-gray-200 rounded-xl focus:ring-2 focus:ring-red-500">
                <option>Client's Transport</option><option>Porter</option><option>Own Vehicle</option><option>Third Party</option>
              </select>
            </InputGroup>
            <InputGroup label="Charges (₹)">
              <input type="number" name="transportCharges" value={formData.transportCharges} onChange={handleChange} className="w-full p-3 bg-white border border-gray-200 rounded-xl focus:ring-2 focus:ring-red-500" />
            </InputGroup>
          </div>
        </Card>

        {/* Material Section */}
        <Card className="p-5">
          <div className="flex items-center gap-2 mb-4 text-gray-700 font-bold">
            <Package size={20}/> <span>Material Information</span>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <InputGroup label="Client / Sender">
              {!isAddingClient ? (
                <div className="flex gap-2">
                  <select name="clientName" value={formData.clientName} onChange={handleChange} className="w-full p-3 bg-white border border-gray-200 rounded-xl focus:ring-2 focus:ring-red-500">
                    <option value="">Select Client</option>
                    {clients.map(c => <option key={c.id} value={c.name}>{c.name}</option>)}
                  </select>
                  <button type="button" onClick={() => setIsAddingClient(true)} className="p-3 bg-red-50 text-red-600 rounded-xl hover:bg-red-100"><Plus size={20}/></button>
                </div>
              ) : (
                <div className="flex gap-2">
                  <input placeholder="New Client" value={newClientName} onChange={(e) => setNewClientName(e.target.value)} className="w-full p-3 border border-red-300 rounded-xl" />
                  <button type="button" onClick={addNewClient} className="px-4 bg-red-600 text-white rounded-xl">Add</button>
                  <button type="button" onClick={() => setIsAddingClient(false)} className="px-3 bg-gray-200 rounded-xl"><X size={18}/></button>
                </div>
              )}
            </InputGroup>

            <InputGroup label="Product">
              {!isAddingProduct ? (
                <div className="flex gap-2">
                  <select name="productName" value={formData.productName} onChange={handleChange} className="w-full p-3 bg-white border border-gray-200 rounded-xl focus:ring-2 focus:ring-red-500">
                    <option value="">Select Product</option>
                    {products.map(p => <option key={p.id} value={p.name}>{p.name}</option>)}
                  </select>
                  <button type="button" onClick={() => setIsAddingProduct(true)} className="p-3 bg-red-50 text-red-600 rounded-xl hover:bg-red-100"><Plus size={20}/></button>
                </div>
              ) : (
                <div className="flex gap-2">
                  <input placeholder="New Product" value={newProductName} onChange={(e) => setNewProductName(e.target.value)} className="w-full p-3 border border-red-300 rounded-xl" />
                  <button type="button" onClick={addNewProduct} className="px-4 bg-red-600 text-white rounded-xl">Add</button>
                  <button type="button" onClick={() => setIsAddingProduct(false)} className="px-3 bg-gray-200 rounded-xl"><X size={18}/></button>
                </div>
              )}
            </InputGroup>

            <InputGroup label="Lot / Batch No." className="md:col-span-2">
              <input type="text" name="lotNo" value={formData.lotNo} onChange={handleChange} placeholder="e.g. BATCH-001" className="w-full p-3 bg-white border border-gray-200 rounded-xl focus:ring-2 focus:ring-red-500" />
            </InputGroup>
            
            <div className="grid grid-cols-2 gap-3 md:col-span-2">
              <InputGroup label="No. of Bags">
                <input type="number" name="bags" value={formData.bags} onChange={handleChange} className="w-full p-3 bg-white border border-gray-200 rounded-xl focus:ring-2 focus:ring-red-500 font-bold" />
              </InputGroup>
              <InputGroup label="Weight/Bag (kg)">
                <input type="number" name="bagWeight" value={formData.bagWeight} onChange={handleChange} className="w-full p-3 bg-white border border-gray-200 rounded-xl focus:ring-2 focus:ring-red-500" />
              </InputGroup>
            </div>
            
            <div className="md:col-span-2 bg-yellow-50 border border-yellow-200 p-4 rounded-xl flex justify-between items-center">
              <span className="text-yellow-800 text-xs font-bold uppercase">Total Quantity</span>
              <div className="text-3xl font-extrabold text-yellow-900">{formData.totalWeight.toLocaleString()} <span className="text-base font-medium">kg</span></div>
            </div>
          </div>
        </Card>

        {/* Action Section */}
        <Card className="p-5">
           <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-xs font-bold text-gray-500 uppercase mb-2">Driver Signature</label>
                <div className="border-2 border-gray-200 border-dashed rounded-xl bg-gray-50 touch-none relative">
                  <canvas 
                    ref={sigCanvas} width={300} height={120}
                    className="w-full cursor-crosshair rounded-xl"
                    onMouseDown={startDrawing} onMouseMove={draw} onMouseUp={stopDrawing} onMouseLeave={stopDrawing}
                    onTouchStart={startDrawing} onTouchMove={draw} onTouchEnd={stopDrawing}
                  />
                  <button type="button" onClick={clearSignature} className="absolute bottom-2 right-2 text-xs bg-white border px-2 py-1 rounded shadow-sm text-gray-500">Clear</button>
                </div>
              </div>

              <div>
                <InputGroup label="Quality Check (QC)">
                  <div className="flex gap-2">
                    {['Pending', 'Approved', 'Rejected'].map(status => (
                      <button key={status} type="button" onClick={() => setFormData(prev => ({ ...prev, qcStatus: status }))}
                        className={`flex-1 py-3 rounded-xl text-sm font-bold border transition-all ${
                          formData.qcStatus === status 
                            ? (status === 'Approved' ? 'bg-green-100 border-green-500 text-green-800' : 
                               status === 'Rejected' ? 'bg-red-100 border-red-500 text-red-800' : 
                               'bg-yellow-100 border-yellow-500 text-yellow-800')
                            : 'bg-white border-gray-200 text-gray-400 hover:bg-gray-50'
                        }`}
                      >
                        {status}
                      </button>
                    ))}
                  </div>
                </InputGroup>
                <InputGroup label="Remarks">
                  <textarea name="remarks" rows="2" value={formData.remarks} onChange={handleChange} className="w-full p-3 bg-white border border-gray-200 rounded-xl focus:ring-2 focus:ring-red-500" placeholder="Notes..." />
                </InputGroup>
              </div>
           </div>
        </Card>

        <Button type="submit" variant="primary" className="w-full py-4 text-lg shadow-xl shadow-red-200">
          <Save size={24} /> Submit Entry
        </Button>
      </form>
    );
  };

  const Dashboard = () => {
    const [searchTerm, setSearchTerm] = useState('');
    const [filterDate, setFilterDate] = useState('');
    const [expandedRow, setExpandedRow] = useState(null);

    const filteredEntries = entries.filter(entry => {
      const matchesSearch = 
        entry.clientName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        entry.productName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        entry.vehicleNo?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        entry.entryCode?.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesDate = filterDate ? entry.dateString === filterDate : true;
      return matchesSearch && matchesDate;
    });

    const downloadCSV = () => {
      const headers = ["Date", "Code", "Vehicle", "Client", "Product", "Lot", "Bags", "Weight", "Total", "Status", "Remarks"];
      const csvRows = [headers.join(',')];
      filteredEntries.forEach(row => {
        const values = [
          row.dateString, row.entryCode, row.vehicleNo, `"${row.clientName}"`, `"${row.productName}"`,
          row.lotNo, row.bags, row.bagWeight, row.totalWeight, row.qcStatus, `"${row.remarks || ''}"`
        ];
        csvRows.push(values.join(','));
      });
      const a = document.createElement('a');
      a.href = window.URL.createObjectURL(new Blob([csvRows.join('\n')], { type: 'text/csv' }));
      a.download = `Register_${new Date().toISOString().slice(0,10)}.csv`;
      document.body.appendChild(a); a.click(); document.body.removeChild(a);
    };

    const updateStatus = async (id, newStatus) => {
      await updateDoc(doc(db, 'artifacts', appId, 'public', 'data', 'entries', id), { qcStatus: newStatus });
    };

    return (
      <div className="space-y-4 pb-24">
        <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100 sticky top-0 z-10">
          <div className="flex gap-3">
            <div className="relative flex-1">
              <SearchIcon className="absolute left-3 top-3 text-gray-400" size={18}/>
              <input type="text" placeholder="Search..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="w-full pl-10 pr-4 py-2.5 bg-gray-50 border-none rounded-xl focus:ring-2 focus:ring-red-500" />
            </div>
            <button onClick={downloadCSV} className="p-3 bg-green-50 text-green-600 rounded-xl hover:bg-green-100"><FileSpreadsheet size={20}/></button>
          </div>
        </div>

        <div className="space-y-3">
          {filteredEntries.map(entry => (
            <div key={entry.id} className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden" onClick={() => setExpandedRow(expandedRow === entry.id ? null : entry.id)}>
              <div className="p-4 flex items-center justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="font-bold text-gray-900">{entry.clientName}</span>
                    <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                      entry.qcStatus === 'Approved' ? 'bg-green-100 text-green-700' : 
                      entry.qcStatus === 'Rejected' ? 'bg-red-100 text-red-700' : 'bg-yellow-100 text-yellow-700'
                    }`}>{entry.qcStatus}</span>
                  </div>
                  <div className="text-xs text-gray-500 flex gap-3">
                    <span className="flex items-center gap-1"><Package size={12}/> {entry.productName}</span>
                    <span className="flex items-center gap-1 font-mono text-gray-700"><Truck size={12}/> {entry.vehicleNo}</span>
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-lg font-extrabold text-gray-800">{entry.totalWeight.toLocaleString()} <span className="text-xs font-normal text-gray-400">kg</span></div>
                  <div className="text-xs text-gray-400">{entry.bags} Bags</div>
                </div>
              </div>

              {expandedRow === entry.id && (
                <div className="bg-gray-50 p-4 border-t border-gray-100 text-sm">
                  <div className="grid grid-cols-2 gap-4 mb-4">
                    <div><span className="text-gray-400 block text-xs">Lot No</span> <span className="font-medium">{entry.lotNo || '-'}</span></div>
                    <div><span className="text-gray-400 block text-xs">Transport</span> <span className="font-medium">{entry.transportMode}</span></div>
                    <div><span className="text-gray-400 block text-xs">Driver</span> <span className="font-medium">{entry.driverName || '-'}</span></div>
                    <div className="col-span-2"><span className="text-gray-400 block text-xs">Remarks</span> <span className="italic text-gray-600">{entry.remarks || 'No remarks'}</span></div>
                  </div>
                  <div className="flex justify-end gap-2 pt-2 border-t border-gray-200">
                    <button onClick={(e) => {e.stopPropagation(); updateStatus(entry.id, 'Approved')}} className="flex items-center gap-1 px-3 py-2 bg-green-100 text-green-700 rounded-lg font-bold text-xs">Approve</button>
                    <button onClick={(e) => {e.stopPropagation(); updateStatus(entry.id, 'Rejected')}} className="flex items-center gap-1 px-3 py-2 bg-red-100 text-red-700 rounded-lg font-bold text-xs">Reject</button>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    );
  };

  const SearchTable = () => { return <Dashboard />; };

  const TodayTableWrapper = () => { return <TodayTable />; };

  if (loading) return <div className="h-screen flex items-center justify-center text-red-600 font-bold bg-white"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-red-600 mr-2"></div> Loading...</div>;

  if (!isAppLoggedIn) return <LoginScreen />;

  return (
    <div className="min-h-screen bg-gray-50 font-sans text-gray-800 pb-safe">
      {/* Top Navbar */}
      <div className="bg-red-700 text-white pt-safe px-4 pb-4 shadow-xl shadow-red-900/10 sticky top-0 z-50">
        <div className="max-w-4xl mx-auto flex justify-between items-center h-14">
          <div className="flex items-center gap-3">
            <div className="bg-white p-1.5 rounded-lg h-10 w-20 flex items-center justify-center shadow-sm">
               {appLogo ? (
                 <img 
                   src={appLogo} 
                   className="max-h-full max-w-full" 
                   style={{ maxWidth: '100%', maxHeight: '40px', objectFit: 'contain' }}
                 /> 
               ) : (
                 <span className="text-red-700 font-black text-xs">TIRTH</span>
               )}
            </div>
            <div>
              <h1 className="text-lg font-bold leading-none tracking-tight">Tirth Industries</h1>
              <p className="text-[10px] text-red-100 opacity-90 font-medium tracking-wide uppercase">Spices & Seasoning</p>
            </div>
          </div>
          <button onClick={() => setIsAppLoggedIn(false)} className="bg-red-800/50 p-2 rounded-lg hover:bg-red-800 text-white/90 backdrop-blur-sm transition-colors"><LogOut size={18}/></button>
        </div>
      </div>

      <main className="max-w-4xl mx-auto p-4">
        {view === 'entry' && <EntryForm />}
        {view === 'today' && <TodayTableWrapper />}
        {view === 'dashboard' && <Dashboard />}
        {view === 'admin' && currentUser?.role === 'admin' && <AdminPanel />}
      </main>

      {/* Bottom Nav */}
      <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-100 px-4 py-2 pb-safe-bottom shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.05)] z-50">
        <div className={`max-w-md mx-auto grid ${currentUser?.role === 'admin' ? 'grid-cols-4' : 'grid-cols-3'} gap-1`}>
          <button onClick={() => setView('entry')} className={`flex flex-col items-center gap-1 p-2 rounded-xl transition-all ${view === 'entry' ? 'text-red-600 bg-red-50' : 'text-gray-400 hover:text-gray-600'}`}>
            <Plus size={24} strokeWidth={view === 'entry' ? 2.5 : 2} />
            <span className="text-[10px] font-bold">New</span>
          </button>
          <button onClick={() => setView('today')} className={`flex flex-col items-center gap-1 p-2 rounded-xl transition-all ${view === 'today' ? 'text-red-600 bg-red-50' : 'text-gray-400 hover:text-gray-600'}`}>
            <ClipboardList size={24} strokeWidth={view === 'today' ? 2.5 : 2} />
            <span className="text-[10px] font-bold">Today</span>
          </button>
          <button onClick={() => setView('dashboard')} className={`flex flex-col items-center gap-1 p-2 rounded-xl transition-all ${view === 'dashboard' ? 'text-red-600 bg-red-50' : 'text-gray-400 hover:text-gray-600'}`}>
            <Database size={24} strokeWidth={view === 'dashboard' ? 2.5 : 2} />
            <span className="text-[10px] font-bold">Records</span>
          </button>
          {currentUser?.role === 'admin' && (
            <button onClick={() => setView('admin')} className={`flex flex-col items-center gap-1 p-2 rounded-xl transition-all ${view === 'admin' ? 'text-red-600 bg-red-50' : 'text-gray-400 hover:text-gray-600'}`}>
              <Settings size={24} strokeWidth={view === 'admin' ? 2.5 : 2} />
              <span className="text-[10px] font-bold">Admin</span>
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

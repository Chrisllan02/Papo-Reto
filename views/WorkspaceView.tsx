
import React, { useState, useRef, useEffect, useMemo } from 'react';
import { 
  Mail, Calendar, HardDrive, FileText, Table, Presentation, 
  Plus, Search, Trash2, Mic, Camera, PhoneOff, 
  ChevronLeft, ChevronRight, Inbox, Send, 
  Video as VideoIcon,
  X, MicOff, CameraOff, MessageSquare,
  Bold, Italic, Underline, AlignLeft, AlignCenter, AlignRight, List as ListIcon,
  Users, Bell, Folder, Home, Laptop2, Info
} from 'lucide-react';
import { WorkspaceEmail, WorkspaceFile, WorkspaceEvent } from '../types';

// --- INITIAL DATA ---
const INITIAL_EMAILS: WorkspaceEmail[] = [
  { id: '1', from: 'Câmara dos Deputados', subject: 'Pauta da Sessão Deliberativa - 15/10', preview: 'Encaminhamos a pauta prevista para a ordem do dia...', date: '10:30', read: false, tag: 'Câmara', folder: 'inbox' },
  { id: '2', from: 'Partido (Liderança)', subject: 'Orientação de Bancada: PL 2630', preview: 'Caros filiados, a orientação para a votação de hoje é...', date: 'Ontem', read: true, tag: 'Partido', folder: 'inbox' },
  { id: '3', from: 'João Eleitor', subject: 'Denúncia sobre buracos na via', preview: 'Gostaria de solicitar atenção para a infraestrutura...', date: 'Ontem', read: true, tag: 'Eleitor', folder: 'inbox' },
  { id: '4', from: 'Assessoria de Imprensa', subject: 'Clipping de Notícias Diário', preview: 'Resumo das menções ao seu nome na mídia...', date: '12 Out', read: true, tag: 'Urgente', folder: 'inbox' },
];

const INITIAL_FILES: WorkspaceFile[] = [
  { id: '5', name: 'Fotos Visita Técnica', type: 'folder', owner: 'Eu', date: '01 Out', size: '-', parentId: null },
  { id: '1', name: 'Discurso Plenário.docx', type: 'doc', owner: 'Eu', date: 'Hoje', size: '2 MB', parentId: null },
  { id: '2', name: 'Orçamento 2024.xlsx', type: 'sheet', owner: 'Assessoria', date: 'Ontem', size: '1.5 MB', parentId: null },
  { id: '3', name: 'Apresentação Campanha.pptx', type: 'slide', owner: 'Marketing', date: '10 Out', size: '5 MB', parentId: null },
  { id: '4', name: 'Projeto Lei Educação.pdf', type: 'pdf', owner: 'Jurídico', date: '05 Out', size: '400 KB', parentId: null },
  { id: '6', name: 'Foto_001.jpg', type: 'doc', owner: 'Eu', date: '01 Out', size: '3 MB', parentId: '5' },
  { id: '7', name: 'Foto_002.jpg', type: 'doc', owner: 'Eu', date: '01 Out', size: '3.2 MB', parentId: '5' },
];

const INITIAL_EVENTS: WorkspaceEvent[] = [
  { id: 1, day: new Date().getDate(), title: 'Sessão Plenário', time: '14:00', type: 'Sessão' },
  { id: 2, day: new Date().getDate(), title: 'Reunião CCJ', time: '10:00', type: 'Reunião' },
  { id: 3, day: new Date().getDate() + 1, title: 'Almoço com Liderança', time: '12:30', type: 'Pessoal' },
];

// --- 1. EMAIL APP ---
const EmailApp = ({ onComposeReply, searchQuery }: { onComposeReply?: (email: WorkspaceEmail) => void, searchQuery: string }) => {
  const [emails, setEmails] = useState<WorkspaceEmail[]>(INITIAL_EMAILS);
  const [selectedEmail, setSelectedEmail] = useState<WorkspaceEmail | null>(null);
  const [composing, setComposing] = useState(false);
  const [activeFolder, setActiveFolder] = useState<'inbox' | 'sent' | 'trash'>('inbox');
  const [newEmail, setNewEmail] = useState({ to: '', subject: '', body: '' });

  const filteredEmails = useMemo(() => {
      let list = emails.filter(e => e.folder === activeFolder);
      if (!searchQuery) return list;
      const lower = searchQuery.toLowerCase();
      return list.filter(e => 
          e.subject.toLowerCase().includes(lower) || 
          e.from.toLowerCase().includes(lower) || 
          e.preview.toLowerCase().includes(lower)
      );
  }, [emails, searchQuery, activeFolder]);

  const handleMoveToTrash = (id: string) => {
      setEmails(prev => prev.map(e => e.id === id ? { ...e, folder: 'trash' } : e));
      if (selectedEmail?.id === id) setSelectedEmail(null);
  };

  const handlePermanentDelete = (id: string) => {
      setEmails(prev => prev.filter(e => e.id !== id));
      if (selectedEmail?.id === id) setSelectedEmail(null);
  };

  const handleReply = () => {
      if (selectedEmail) {
          setNewEmail({
              to: selectedEmail.from,
              subject: `Re: ${selectedEmail.subject}`,
              body: `\n\nEm resposta a: "${selectedEmail.preview}"`
          });
          setComposing(true);
      }
  };

  const handleSend = () => {
      if (!newEmail.to || !newEmail.subject) return;
      const sentEmail: WorkspaceEmail = {
          id: Date.now().toString(),
          from: 'Para: ' + newEmail.to,
          subject: newEmail.subject,
          preview: newEmail.body.substring(0, 50) + '...',
          date: 'Agora',
          read: true,
          tag: 'Câmara',
          folder: 'sent'
      };
      setEmails(prev => [sentEmail, ...prev]);
      setComposing(false);
      setNewEmail({ to: '', subject: '', body: '' });
      setActiveFolder('sent'); 
  };

  const FolderButton = ({ id, label, icon: Icon }: any) => (
      <button 
        onClick={() => { setActiveFolder(id); setSelectedEmail(null); }}
        className={`flex items-center gap-3 w-full px-4 py-3 rounded-xl transition-all ${
            activeFolder === id 
            ? 'bg-blue-50 text-blue-700 dark:bg-blue-900/40 dark:text-blue-200 font-bold' 
            : 'text-gray-500 hover:bg-gray-50 dark:hover:bg-white/5'
        }`}
      >
          <Icon size={18}/>
          <span className="text-sm font-medium">{label}</span>
          {id === 'inbox' && <span className="ml-auto text-[10px] font-bold bg-blue-100 dark:bg-blue-900 text-blue-600 dark:text-blue-300 px-2 py-0.5 rounded-full">{emails.filter(e => e.folder === 'inbox' && !e.read).length}</span>}
      </button>
  );

  return (
    <div className="flex h-full bg-white/50 dark:bg-gray-900/50 backdrop-blur-md rounded-[2rem] overflow-hidden border border-white/20 dark:border-white/10 relative">
      
      {/* Compose Modal */}
      {composing && (
          <div className="absolute inset-0 z-50 bg-black/40 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in">
              <div className="glass-card dark:bg-midnight w-full max-w-lg rounded-3xl shadow-2xl flex flex-col overflow-hidden animate-in zoom-in-95 duration-200 border border-white/20">
                  <div className="p-5 border-b border-gray-100 dark:border-white/10 flex justify-between items-center bg-gray-50/50 dark:bg-white/5">
                      <h3 className="font-bold text-gray-700 dark:text-gray-200">Nova Mensagem</h3>
                      <button onClick={() => setComposing(false)} className="p-2 hover:bg-gray-200 dark:hover:bg-white/10 rounded-full transition-colors"><X size={18}/></button>
                  </div>
                  <div className="p-5 space-y-4">
                      <input 
                        placeholder="Para" 
                        value={newEmail.to}
                        onChange={e => setNewEmail({...newEmail, to: e.target.value})}
                        className="w-full p-3 bg-white dark:bg-black/20 border border-gray-200 dark:border-white/10 rounded-xl outline-none text-sm"
                      />
                      <input 
                        placeholder="Assunto" 
                        value={newEmail.subject}
                        onChange={e => setNewEmail({...newEmail, subject: e.target.value})}
                        className="w-full p-3 bg-white dark:bg-black/20 border border-gray-200 dark:border-white/10 rounded-xl outline-none text-sm"
                      />
                      <textarea 
                        placeholder="Escreva sua mensagem..." 
                        value={newEmail.body}
                        onChange={e => setNewEmail({...newEmail, body: e.target.value})}
                        className="w-full h-48 p-3 bg-white dark:bg-black/20 border border-gray-200 dark:border-white/10 rounded-xl outline-none text-sm resize-none"
                      ></textarea>
                  </div>
                  <div className="p-5 border-t border-gray-100 dark:border-white/10 flex justify-end gap-3">
                      <button onClick={() => setComposing(false)} className="px-6 py-2 text-gray-500 font-bold text-xs hover:bg-gray-100 dark:hover:bg-white/10 rounded-xl transition-colors">Cancelar</button>
                      <button onClick={handleSend} className="px-6 py-2 bg-blue-600 text-white font-bold text-xs rounded-xl hover:bg-blue-700 flex items-center gap-2 shadow-lg active:scale-95 transition-all">
                          <Send size={16}/> Enviar
                      </button>
                  </div>
              </div>
          </div>
      )}

      {/* Sidebar List */}
      <div className={`w-full md:w-80 border-r border-gray-100 dark:border-white/5 flex flex-col bg-white/30 dark:bg-black/20 ${selectedEmail ? 'hidden md:flex' : 'flex'}`}>
        <div className="p-4 space-y-3">
            <button onClick={() => { setNewEmail({to:'',subject:'',body:''}); setComposing(true); }} className="w-full py-3 bg-blue-600 text-white rounded-xl hover:bg-blue-700 transition-colors shadow-md font-bold text-sm flex items-center justify-center gap-2 active:scale-[0.98]">
                <Plus size={18}/> Escrever
            </button>
            <div className="flex flex-col gap-1">
                <FolderButton id="inbox" label="Entrada" icon={Inbox}/>
                <FolderButton id="sent" label="Enviados" icon={Send}/>
                <FolderButton id="trash" label="Lixeira" icon={Trash2}/>
            </div>
        </div>
        
        <div className="flex-1 overflow-y-auto px-2 pb-2">
            {filteredEmails.length === 0 && <div className="text-center p-8 text-gray-400 text-xs font-bold uppercase tracking-widest">Vazio</div>}
            {filteredEmails.map(email => (
                <div 
                    key={email.id} 
                    onClick={() => { setSelectedEmail(email); if(email.folder==='inbox') setEmails(prev => prev.map(e => e.id === email.id ? {...e, read: true} : e)); }}
                    className={`p-3 mb-1 rounded-xl cursor-pointer hover:bg-white/60 dark:hover:bg-white/5 transition-all border border-transparent ${selectedEmail?.id === email.id ? 'bg-white dark:bg-white/10 border-gray-100 dark:border-white/5 shadow-sm' : ''}`}
                >
                    <div className="flex justify-between mb-1">
                        <span className={`font-bold text-xs truncate ${!email.read && email.folder==='inbox' ? 'text-blue-600 dark:text-blue-400' : 'text-gray-700 dark:text-gray-300'}`}>{email.from}</span>
                        <span className="text-[9px] font-bold text-gray-400 uppercase shrink-0 ml-2">{email.date}</span>
                    </div>
                    <p className={`text-xs mb-1 truncate ${!email.read && email.folder==='inbox' ? 'font-black text-gray-900 dark:text-white' : 'font-medium text-gray-600 dark:text-gray-400'}`}>{email.subject}</p>
                    <p className="text-[10px] text-gray-400 truncate">{email.preview}</p>
                </div>
            ))}
        </div>
      </div>

      {/* Email Detail */}
      <div className={`flex-1 flex flex-col bg-white/40 dark:bg-gray-900/40 backdrop-blur-sm ${!selectedEmail ? 'hidden md:flex items-center justify-center' : 'flex'}`}>
          {selectedEmail ? (
              <>
                <div className="p-6 border-b border-gray-100 dark:border-white/5 flex justify-between items-start">
                    <div>
                        <button onClick={() => setSelectedEmail(null)} className="md:hidden mb-4 text-blue-500 flex items-center gap-1 text-xs font-bold p-2 -ml-2 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded-lg transition-colors"><ChevronLeft size={16}/> Voltar</button>
                        <h2 className="text-xl md:text-2xl font-black text-gray-900 dark:text-white mb-2 leading-tight">{selectedEmail.subject}</h2>
                        <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-blue-500 to-blue-600 text-white flex items-center justify-center font-bold text-xs shadow-sm">{selectedEmail.from[0]}</div>
                            <div>
                                <p className="text-sm font-bold text-gray-800 dark:text-gray-200">{selectedEmail.from}</p>
                                <p className="text-[10px] text-gray-400 font-medium">para mim</p>
                            </div>
                        </div>
                    </div>
                    <div className="flex gap-2">
                        {activeFolder === 'trash' ? (
                            <button onClick={() => handlePermanentDelete(selectedEmail.id)} className="p-2.5 text-red-500 bg-red-50 hover:bg-red-100 dark:bg-red-900/20 dark:hover:bg-red-900/30 rounded-xl transition-colors" title="Excluir"><X size={18}/></button>
                        ) : (
                            <button onClick={() => handleMoveToTrash(selectedEmail.id)} className="p-2.5 text-gray-400 hover:text-red-500 hover:bg-gray-100 dark:hover:bg-white/10 rounded-xl transition-colors"><Trash2 size={18}/></button>
                        )}
                    </div>
                </div>
                <div className="p-8 flex-1 overflow-y-auto font-medium text-gray-700 dark:text-gray-300 leading-loose whitespace-pre-wrap text-sm">
                    {selectedEmail.preview}
                    {'\n\n'}
                    Lorem ipsum dolor sit amet, consectetur adipiscing elit. Sed do eiusmod tempor incididunt ut labore et dolore magna aliqua. Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris nisi ut aliquip ex ea commodo consequat.
                </div>
                <div className="p-4 border-t border-gray-100 dark:border-white/5 flex gap-3">
                    {activeFolder !== 'trash' && (
                        <button onClick={handleReply} className="flex-1 py-3 bg-blue-600 rounded-xl text-sm font-bold text-white hover:bg-blue-700 flex items-center justify-center gap-2 shadow-lg transition-transform active:scale-[0.98]"><Send size={16}/> Responder</button>
                    )}
                </div>
              </>
          ) : (
              <div className="text-center text-gray-400">
                  <div className="w-20 h-20 bg-gray-100 dark:bg-white/5 rounded-full flex items-center justify-center mx-auto mb-4">
                      <Mail size={32} className="opacity-30"/>
                  </div>
                  <p className="text-xs font-bold uppercase tracking-widest opacity-60">Selecione uma mensagem</p>
              </div>
          )}
      </div>
    </div>
  );
};

// --- 2. CALENDAR APP ---
const CalendarApp = ({ searchQuery }: { searchQuery: string }) => {
    const [events, setEvents] = useState<WorkspaceEvent[]>(INITIAL_EVENTS);
    const [currentDay, setCurrentDay] = useState(new Date().getDate());
    const [newEventTitle, setNewEventTitle] = useState('');
    const [selectedEvent, setSelectedEvent] = useState<WorkspaceEvent | null>(null);

    const handleAddEvent = () => {
        if (!newEventTitle) return;
        const newEvent: WorkspaceEvent = {
            id: Date.now(),
            day: currentDay,
            title: newEventTitle,
            time: '09:00',
            type: 'Pessoal'
        };
        setEvents([...events, newEvent]);
        setNewEventTitle('');
    };

    const filteredEvents = useMemo(() => {
        if (!searchQuery) return events;
        const lower = searchQuery.toLowerCase();
        return events.filter(e => e.title.toLowerCase().includes(lower));
    }, [events, searchQuery]);

    const searchMatchDays = useMemo(() => {
        if (!searchQuery) return [];
        return filteredEvents.map(e => e.day);
    }, [filteredEvents, searchQuery]);

    return (
        <div className="h-full flex flex-col bg-white/50 dark:bg-gray-900/50 backdrop-blur-md rounded-[2rem] overflow-hidden border border-white/20 dark:border-white/10 relative">
            {selectedEvent && (
                <div className="absolute inset-0 z-50 bg-black/40 backdrop-blur-sm flex items-center justify-center p-6 animate-in fade-in" onClick={() => setSelectedEvent(null)}>
                    <div className="glass-card dark:bg-midnight w-full max-w-sm rounded-[2.5rem] p-8 shadow-2xl relative border border-white/20" onClick={e => e.stopPropagation()}>
                        <button onClick={() => setSelectedEvent(null)} className="absolute top-6 right-6 p-3 hover:bg-gray-100 dark:hover:bg-white/10 rounded-full transition-colors"><X size={20}/></button>
                        <div className={`w-14 h-14 rounded-2xl flex items-center justify-center mb-6 shadow-sm ${
                            selectedEvent.type === 'Sessão' ? 'bg-green-100 text-green-600' :
                            selectedEvent.type === 'Reunião' ? 'bg-blue-100 text-blue-600' :
                            'bg-yellow-100 text-yellow-600'
                        }`}>
                            <Calendar size={24}/>
                        </div>
                        <h3 className="text-xl font-black text-gray-900 dark:text-white mb-2 leading-tight">{selectedEvent.title}</h3>
                        <p className="text-xs font-bold text-gray-500 uppercase mb-8 tracking-wide">{selectedEvent.type} • {selectedEvent.time}</p>
                        <button onClick={() => { setEvents(events.filter(e => e.id !== selectedEvent.id)); setSelectedEvent(null); }} className="w-full py-3 border border-red-200 text-red-500 font-bold rounded-xl hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors text-xs flex items-center justify-center gap-2 uppercase tracking-wider">
                            <Trash2 size={16}/> Cancelar Evento
                        </button>
                    </div>
                </div>
            )}
            
            <div className="p-6 border-b border-gray-100 dark:border-white/5 flex justify-between items-center bg-gray-50/30 dark:bg-white/5">
                <h3 className="font-black text-gray-800 dark:text-white text-xl tracking-tight">Outubro 2023</h3>
                <div className="flex gap-2">
                    <button className="p-2 bg-white dark:bg-white/5 border border-gray-100 dark:border-white/10 rounded-full hover:bg-gray-50 transition-colors"><ChevronLeft size={16}/></button>
                    <button className="p-2 bg-white dark:bg-white/5 border border-gray-100 dark:border-white/10 rounded-full hover:bg-gray-50 transition-colors"><ChevronRight size={16}/></button>
                    <button onClick={() => setCurrentDay(new Date().getDate())} className="px-4 py-2 bg-blue-600 text-white rounded-full font-bold text-[10px] uppercase tracking-wider shadow-md hover:bg-blue-700 transition-colors">Hoje</button>
                </div>
            </div>
            
            <div className="flex-1 grid grid-cols-7 grid-rows-5 gap-px bg-gray-100 dark:bg-white/5 p-px">
                {Array.from({length: 31}, (_, i) => i + 1).map(day => {
                    const dayEvents = events.filter(e => e.day === day);
                    const visibleEvents = searchQuery ? dayEvents.filter(e => e.title.toLowerCase().includes(searchQuery.toLowerCase())) : dayEvents;
                    const isSelected = day === currentDay;
                    const isSearchMatch = searchMatchDays.includes(day);

                    return (
                        <div 
                            key={day} 
                            onClick={() => setCurrentDay(day)}
                            className={`bg-white dark:bg-gray-900 min-h-[80px] p-2 relative group hover:bg-gray-50 dark:hover:bg-black transition-colors cursor-pointer flex flex-col ${isSelected ? 'bg-blue-50/50 dark:bg-blue-900/20' : ''} ${isSearchMatch ? 'bg-yellow-50/50 dark:bg-yellow-900/10' : ''}`}
                        >
                            <span className={`text-[10px] font-black mb-1 ${isSelected ? 'bg-blue-600 text-white w-6 h-6 flex items-center justify-center rounded-full shadow-sm' : 'text-gray-400'}`}>{day}</span>
                            <div className="flex-1 space-y-1 w-full overflow-hidden">
                                {visibleEvents.map(ev => (
                                    <div 
                                        key={ev.id} 
                                        onClick={(e) => { e.stopPropagation(); setSelectedEvent(ev); }}
                                        className={`text-[8px] px-1.5 py-1 rounded truncate font-bold hover:opacity-80 transition-opacity cursor-pointer ${
                                        ev.type === 'Sessão' ? 'bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-300' :
                                        ev.type === 'Reunião' ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300' :
                                        'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/40 dark:text-yellow-300'
                                    }`}>
                                        {ev.time} {ev.title}
                                    </div>
                                ))}
                            </div>
                            {isSelected && !searchQuery && (
                                <div className="absolute inset-x-1 bottom-1 bg-white dark:bg-gray-800 p-1.5 rounded-lg flex gap-1 shadow-lg opacity-0 group-hover:opacity-100 transition-opacity z-10 border border-gray-100 dark:border-white/10" onClick={e => e.stopPropagation()}>
                                    <input 
                                        value={newEventTitle}
                                        onChange={e => setNewEventTitle(e.target.value)}
                                        placeholder="Novo..."
                                        className="w-full text-[10px] font-medium bg-transparent outline-none text-gray-900 dark:text-white"
                                        onKeyDown={e => e.key === 'Enter' && handleAddEvent()}
                                    />
                                    <button onClick={handleAddEvent} className="bg-blue-600 text-white p-1 rounded hover:bg-blue-700"><Plus size={12}/></button>
                                </div>
                            )}
                        </div>
                    )
                })}
            </div>
        </div>
    );
};

// --- 3. DRIVE APP ---
const DriveApp = ({ onOpenFile, searchQuery }: { onOpenFile: (file: WorkspaceFile) => void, searchQuery: string }) => {
    const [files, setFiles] = useState<WorkspaceFile[]>(INITIAL_FILES);
    const [currentFolderId, setCurrentFolderId] = useState<string | null>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);

    const filteredFiles = useMemo(() => {
        if (searchQuery) {
            return files.filter(f => f.name.toLowerCase().includes(searchQuery.toLowerCase()));
        }
        return files.filter(f => f.parentId === currentFolderId);
    }, [files, searchQuery, currentFolderId]);

    const currentFolder = files.find(f => f.id === currentFolderId);

    const handleUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files[0]) {
            const f = e.target.files[0];
            const newFile: WorkspaceFile = {
                id: Date.now().toString(),
                name: f.name,
                type: f.name.endsWith('.pdf') ? 'pdf' : (f.name.endsWith('.xlsx') || f.name.endsWith('.csv')) ? 'sheet' : 'doc',
                owner: 'Eu',
                date: 'Agora',
                size: `${(f.size / 1024 / 1024).toFixed(1)} MB`,
                parentId: currentFolderId
            };
            setFiles([newFile, ...files]);
        }
    };

    const handleDelete = (id: string) => {
        if(confirm("Deseja apagar este arquivo?")) {
            setFiles(files.filter(f => f.id !== id));
        }
    };

    return (
        <div className="h-full flex flex-col bg-white/50 dark:bg-gray-900/50 backdrop-blur-md rounded-[2rem] overflow-hidden border border-white/20 dark:border-white/10 p-6 md:p-8 relative">
            <div className="flex justify-between items-center mb-6">
                <div>
                    <h3 className="font-black text-gray-800 dark:text-white text-xl tracking-tight">
                        {currentFolderId ? currentFolder?.name : 'Meus Arquivos'}
                    </h3>
                    <div className="flex items-center gap-2 text-[10px] text-gray-400 mt-1 font-bold uppercase tracking-wide">
                        <button onClick={() => setCurrentFolderId(null)} className="hover:text-blue-500 cursor-pointer flex items-center gap-1 hover:underline">
                            <Home size={10}/> Início
                        </button>
                        {currentFolderId && (
                            <>
                                <ChevronRight size={10}/>
                                <span className="text-gray-600 dark:text-gray-300">{currentFolder?.name}</span>
                            </>
                        )}
                    </div>
                </div>
                <button 
                    onClick={() => fileInputRef.current?.click()}
                    className="flex items-center gap-2 px-5 py-2.5 bg-blue-600 text-white rounded-xl font-black text-[10px] uppercase tracking-widest shadow-lg hover:bg-blue-700 transition-colors active:scale-95"
                >
                    <Plus size={14}/> Upload
                </button>
                <input type="file" ref={fileInputRef} className="hidden" onChange={handleUpload} />
            </div>
            
            <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-4 overflow-y-auto pb-10 custom-scrollbar">
                {filteredFiles.length === 0 && <div className="col-span-full text-center py-12 text-gray-400 text-xs font-bold uppercase tracking-widest opacity-50">Pasta vazia.</div>}
                
                {filteredFiles.map(file => (
                    <div 
                        key={file.id} 
                        onClick={() => file.type === 'folder' ? setCurrentFolderId(file.id) : onOpenFile(file)}
                        className="group p-4 rounded-3xl border border-gray-100/50 dark:border-white/5 hover:bg-white/60 dark:hover:bg-white/5 hover:border-blue-200 dark:hover:border-blue-900 transition-all cursor-pointer flex flex-col items-center text-center relative min-h-[140px] justify-between active:scale-[0.98]"
                    >
                        <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity">
                            <button onClick={(e) => { e.stopPropagation(); handleDelete(file.id); }} className="p-1.5 hover:bg-red-100 hover:text-red-500 rounded-full text-gray-400 transition-colors"><Trash2 size={14}/></button>
                        </div>
                        <div className={`w-16 h-16 rounded-2xl flex items-center justify-center mb-3 shadow-sm ${
                            file.type === 'doc' ? 'bg-blue-50 text-blue-600 dark:bg-blue-900/20 dark:text-blue-400' :
                            file.type === 'sheet' ? 'bg-green-50 text-green-600 dark:bg-green-900/20 dark:text-green-400' :
                            file.type === 'slide' ? 'bg-orange-50 text-orange-600 dark:bg-orange-900/20 dark:text-orange-400' :
                            file.type === 'pdf' ? 'bg-red-50 text-red-600 dark:bg-red-900/20 dark:text-red-400' :
                            'bg-yellow-50 text-yellow-600 dark:bg-yellow-900/20 dark:text-yellow-400'
                        }`}>
                            {file.type === 'doc' && <FileText size={28}/>}
                            {file.type === 'sheet' && <Table size={28}/>}
                            {file.type === 'slide' && <Presentation size={28}/>}
                            {file.type === 'pdf' && <FileText size={28}/>}
                            {file.type === 'folder' && <Folder size={28}/>}
                        </div>
                        <div className="w-full">
                            <p className="text-xs font-bold text-gray-800 dark:text-white truncate w-full mb-0.5">{file.name}</p>
                            <p className="text-[9px] text-gray-400 font-bold uppercase tracking-wide">{file.size}</p>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
};

// --- 4. MEET APP ---
const MeetApp = () => {
    const [micOn, setMicOn] = useState(false);
    const [camOn, setCamOn] = useState(true);
    const [showChat, setShowChat] = useState(false);
    const [messages, setMessages] = useState<{user: string, text: string}[]>([
        {user: 'Dep. Silva', text: 'Bom dia a todos, podemos começar?'}
    ]);
    const [chatMsg, setChatMsg] = useState('');

    const handleSendChat = () => {
        if (!chatMsg) return;
        setMessages([...messages, { user: 'Eu', text: chatMsg }]);
        setChatMsg('');
    };

    return (
        <div className="h-full flex flex-col bg-black rounded-[2rem] overflow-hidden relative shadow-2xl border border-white/10">
            <div className="absolute top-4 left-4 z-10 bg-red-600/90 backdrop-blur-md px-3 py-1.5 rounded-full text-white font-black text-[10px] border border-red-500/50 flex items-center gap-2 uppercase tracking-widest shadow-lg">
                <div className="w-2 h-2 bg-white rounded-full animate-pulse"></div>
                Ao Vivo
            </div>
            
            <div className="flex-1 grid grid-cols-2 gap-1 p-1">
                {/* Simulated Video Feeds */}
                {['https://images.unsplash.com/photo-1560250097-0b93528c311a?auto=format&fit=crop&w=400&q=80', 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?auto=format&fit=crop&w=400&q=80', 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=400&q=80'].map((src, i) => (
                    <div key={i} className="bg-gray-800 rounded-2xl relative overflow-hidden group">
                        <img src={src} className="w-full h-full object-cover opacity-90 group-hover:opacity-100 transition-opacity" alt=""/>
                        <div className="absolute bottom-2 left-2 text-white text-[9px] font-bold bg-black/60 backdrop-blur-sm px-2 py-1 rounded-md border border-white/10">Participante {i+1}</div>
                    </div>
                ))}
                <div className="bg-gray-900 rounded-2xl flex items-center justify-center relative border border-gray-800 overflow-hidden">
                    {camOn ? (
                        <div className="absolute inset-0 bg-gray-800 flex items-center justify-center">
                            <span className="text-gray-600 text-[10px] font-bold uppercase tracking-widest">Sua Câmera</span>
                        </div>
                    ) : (
                        <div className="w-16 h-16 rounded-full bg-blue-600 flex items-center justify-center text-white font-black text-xl shadow-lg">EU</div>
                    )}
                    <div className="absolute bottom-2 left-2 text-white text-[9px] font-bold bg-black/60 backdrop-blur-sm px-2 py-1 rounded-md border border-white/10 flex items-center gap-2">
                        Você {!micOn && <MicOff size={10} className="text-red-500"/>}
                    </div>
                </div>

                {/* Chat Overlay */}
                {showChat && (
                    <div className="absolute right-2 top-2 bottom-2 w-64 bg-black/80 backdrop-blur-xl border border-white/10 rounded-2xl flex flex-col z-20 animate-in slide-in-from-right">
                        <div className="flex justify-between items-center p-3 border-b border-white/10">
                            <h3 className="font-bold text-white text-xs">Chat</h3>
                            <button onClick={() => setShowChat(false)} className="hover:text-white text-gray-400"><X size={14}/></button>
                        </div>
                        <div className="flex-1 overflow-y-auto p-3 space-y-3">
                            {messages.map((m, i) => (
                                <div key={i} className="text-[10px]">
                                    <span className="font-bold text-blue-400 block mb-0.5">{m.user}</span>
                                    <span className="text-gray-300">{m.text}</span>
                                </div>
                            ))}
                        </div>
                        <div className="p-2 border-t border-white/10 flex gap-2">
                            <input 
                                className="flex-1 bg-white/10 rounded-lg px-2 py-1.5 text-[10px] text-white outline-none border border-transparent focus:border-white/20"
                                placeholder="Mensagem..."
                                value={chatMsg}
                                onChange={e => setChatMsg(e.target.value)}
                                onKeyDown={e => e.key === 'Enter' && handleSendChat()}
                            />
                            <button onClick={handleSendChat} className="text-blue-500 hover:text-blue-400"><Send size={14}/></button>
                        </div>
                    </div>
                )}
            </div>
            
            <div className="h-16 bg-gray-900 flex items-center justify-center gap-4 border-t border-white/10">
                <button onClick={() => setMicOn(!micOn)} className={`p-3 rounded-full transition-all ${micOn ? 'bg-white/10 text-white' : 'bg-red-500 text-white'}`}>{micOn ? <Mic size={18}/> : <MicOff size={18}/>}</button>
                <button onClick={() => setCamOn(!camOn)} className={`p-3 rounded-full transition-all ${camOn ? 'bg-white/10 text-white' : 'bg-red-500 text-white'}`}>{camOn ? <Camera size={18}/> : <CameraOff size={18}/>}</button>
                <button className="p-3 rounded-full bg-red-600 text-white hover:bg-red-700 shadow-lg scale-110 mx-2 active:scale-95"><PhoneOff size={20}/></button>
                <button onClick={() => setShowChat(!showChat)} className={`p-3 rounded-full transition-all ${showChat ? 'bg-blue-600 text-white' : 'bg-white/10 text-white'}`}><MessageSquare size={18}/></button>
            </div>
        </div>
    );
};

// --- 5. EDITOR APP ---
const EditorApp = ({ type, file }: { type: 'doc' | 'sheet', file?: WorkspaceFile }) => {
    const [fileName, setFileName] = useState(file?.name || (type === 'doc' ? 'Novo Documento' : 'Nova Planilha'));
    const [cells, setCells] = useState<string[][]>([
        ['Categoria', 'Valor (R$)', 'Status'],
        ['Passagens', '2500', 'Pago'],
        ['Hospedagem', '1200', 'Pendente'],
        ['Divulgação', '5000', 'Pago'],
        ['Total', '8700', '-']
    ]);

    const execCmd = (command: string) => { document.execCommand(command, false, undefined); };

    return (
        <div className="h-full flex flex-col bg-white dark:bg-gray-900 rounded-[2rem] overflow-hidden border border-gray-200 dark:border-gray-700 shadow-sm">
            <div className="flex flex-col border-b border-gray-100 dark:border-gray-800 bg-gray-50/50 dark:bg-black/20">
                <div className="p-4 flex justify-between items-center">
                    <div className="flex items-center gap-3">
                        <div className={`p-2 rounded-lg text-white shadow-sm ${type === 'doc' ? 'bg-blue-600' : 'bg-green-600'}`}>
                            {type === 'doc' ? <FileText size={18}/> : <Table size={18}/>}
                        </div>
                        <input 
                            value={fileName}
                            onChange={e => setFileName(e.target.value)}
                            className="font-bold text-gray-800 dark:text-white text-sm bg-transparent outline-none hover:bg-gray-100 dark:hover:bg-white/5 px-2 py-1 rounded transition-colors"
                        />
                    </div>
                    <button className="px-4 py-2 bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-300 rounded-lg text-[10px] font-bold uppercase tracking-wider hover:bg-blue-200 transition-colors">
                        Salvar
                    </button>
                </div>
                
                {/* Simplified Toolbar */}
                <div className="px-4 pb-2 flex gap-2 items-center">
                    <button onClick={() => execCmd('bold')} className="p-1.5 hover:bg-gray-200 dark:hover:bg-white/10 rounded text-gray-600 dark:text-gray-300"><Bold size={16}/></button>
                    <button onClick={() => execCmd('italic')} className="p-1.5 hover:bg-gray-200 dark:hover:bg-white/10 rounded text-gray-600 dark:text-gray-300"><Italic size={16}/></button>
                    <div className="w-px h-4 bg-gray-300 dark:bg-gray-700 mx-1"></div>
                    <button onClick={() => execCmd('justifyLeft')} className="p-1.5 hover:bg-gray-200 dark:hover:bg-white/10 rounded text-gray-600 dark:text-gray-300"><AlignLeft size={16}/></button>
                    <button onClick={() => execCmd('justifyCenter')} className="p-1.5 hover:bg-gray-200 dark:hover:bg-white/10 rounded text-gray-600 dark:text-gray-300"><AlignCenter size={16}/></button>
                </div>
            </div>
            
            <div className="flex-1 bg-gray-100 dark:bg-black/40 overflow-y-auto p-6 md:p-8 flex justify-center">
                <div className="w-full max-w-3xl bg-white dark:bg-[#1a1a1a] shadow-lg min-h-[600px] p-10 outline-none text-gray-800 dark:text-gray-200" contentEditable={type === 'doc'} suppressContentEditableWarning>
                    {type === 'doc' ? (
                        <div className="prose dark:prose-invert max-w-none">
                            <h1 className="text-2xl font-bold mb-4">{file?.name ? file.name.replace('.docx','') : 'Novo Projeto'}</h1>
                            <p>Texto do documento...</p>
                        </div>
                    ) : (
                        <div className="w-full border border-gray-200 dark:border-gray-700 text-xs">
                            {cells.map((row, i) => (
                                <div key={i} className="flex border-b border-gray-200 dark:border-gray-700 last:border-0">
                                    {row.map((cell, j) => (
                                        <div key={j} className={`flex-1 p-2 border-r border-gray-200 dark:border-gray-700 last:border-0 ${i===0 ? 'bg-gray-50 dark:bg-gray-800 font-bold' : ''}`}>
                                            {cell}
                                        </div>
                                    ))}
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

// --- MAIN WORKSPACE VIEW ---
const WorkspaceView: React.FC = () => {
    const [activeApp, setActiveApp] = useState<'mail' | 'calendar' | 'drive' | 'meet' | 'docs' | 'sheets'>('mail');
    const [currentFile, setCurrentFile] = useState<WorkspaceFile | undefined>(undefined);
    const [searchQuery, setSearchQuery] = useState('');

    const handleOpenFile = (file: WorkspaceFile) => {
        setCurrentFile(file);
        if (file.type === 'doc' || file.type === 'pdf') setActiveApp('docs');
        else if (file.type === 'sheet') setActiveApp('sheets');
        else if (file.type === 'slide') setActiveApp('drive'); 
    };

    const TabButton = ({ id, label, icon: Icon, color }: any) => {
        const isActive = activeApp === id;
        return (
            <button
                onClick={() => { setActiveApp(id); if(id !== 'docs' && id !== 'sheets') setCurrentFile(undefined); }}
                className={`flex items-center gap-2 px-4 py-2.5 rounded-full transition-all text-xs font-black uppercase tracking-wider border ${
                    isActive 
                    ? `bg-white dark:bg-gray-800 text-${color}-600 border-${color}-200 shadow-sm scale-105`
                    : 'bg-white/40 dark:bg-white/5 text-gray-500 border-transparent hover:bg-white/60 dark:hover:bg-white/10'
                }`}
            >
                <Icon size={14} className={isActive ? `text-${color}-500` : 'text-gray-400'} strokeWidth={2.5}/>
                {label}
            </button>
        );
    };

    return (
        <div className="w-full h-full bg-transparent font-sans flex flex-col animate-in fade-in duration-500 overflow-hidden">
            
            {/* Header Area */}
            <div className="pt-6 px-6 pb-4 shrink-0">
                <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-6">
                    <div>
                        <div className="flex items-center gap-3">
                            <div className="p-2.5 bg-indigo-100/50 dark:bg-indigo-900/30 rounded-xl text-indigo-600 dark:text-indigo-400 backdrop-blur-sm">
                                <Laptop2 size={24} />
                            </div>
                            <h1 className="text-3xl font-black text-gray-900 dark:text-white tracking-tight">
                                Gabinete Digital
                            </h1>
                        </div>
                        <div className="flex items-center gap-2 mt-2">
                            <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-yellow-100/80 dark:bg-yellow-900/30 border border-yellow-200 dark:border-yellow-900/50 text-[9px] font-black uppercase text-yellow-700 dark:text-yellow-400 tracking-widest">
                                <Info size={10} strokeWidth={3} /> Modo Simulação
                            </span>
                            <p className="text-xs font-medium text-gray-500 dark:text-gray-400">Ferramentas de produtividade legislativa.</p>
                        </div>
                    </div>

                    {/* Search Bar */}
                    <div className="relative group w-full md:w-64">
                        <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 group-focus-within:text-blue-500 transition-colors" size={16}/>
                        <input 
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            placeholder="Buscar..."
                            className="w-full pl-10 pr-4 py-3 bg-white/60 dark:bg-gray-900/60 backdrop-blur-md rounded-2xl text-xs font-bold shadow-sm border border-white/40 dark:border-white/10 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 transition-all outline-none"
                        />
                    </div>
                </div>

                {/* App Navigation Tabs (Replaces Dock) */}
                <div className="flex gap-2 overflow-x-auto scrollbar-hide pb-2">
                    <TabButton id="mail" label="Correio" icon={Mail} color="red" />
                    <TabButton id="calendar" label="Agenda" icon={Calendar} color="blue" />
                    <TabButton id="drive" label="Arquivos" icon={HardDrive} color="yellow" />
                    <TabButton id="meet" label="Plenário" icon={VideoIcon} color="purple" />
                    <TabButton id="docs" label="Editor" icon={FileText} color="green" />
                </div>
            </div>

            {/* Main Application Area (Unified Container) */}
            <div className="flex-1 px-4 md:px-6 pb-6 overflow-hidden">
                <div className="w-full h-full glass-card dark:bg-midnight/80 backdrop-blur-xl rounded-[2.5rem] p-1.5 shadow-2xl relative overflow-hidden border border-white/20 dark:border-white/10">
                    <div className="w-full h-full bg-white/40 dark:bg-black/20 rounded-[2rem] overflow-hidden">
                        {activeApp === 'mail' && <EmailApp searchQuery={searchQuery} />}
                        {activeApp === 'calendar' && <CalendarApp searchQuery={searchQuery} />}
                        {activeApp === 'drive' && <DriveApp onOpenFile={handleOpenFile} searchQuery={searchQuery} />}
                        {activeApp === 'meet' && <MeetApp />}
                        {activeApp === 'docs' && <EditorApp type="doc" file={currentFile} />}
                        {activeApp === 'sheets' && <EditorApp type="sheet" file={currentFile} />}
                    </div>
                </div>
            </div>

        </div>
    );
};

export default WorkspaceView;

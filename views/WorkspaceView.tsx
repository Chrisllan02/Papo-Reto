
import React, { useState, useRef, useEffect, useMemo } from 'react';
import { 
  Mail, Calendar, HardDrive, FileText, Table, Presentation, 
  Plus, Search, Trash2, Mic, Camera, PhoneOff, 
  ChevronLeft, ChevronRight, Inbox, Send, 
  Video as VideoIcon,
  X, MicOff, CameraOff, MessageSquare,
  Bold, Italic, Underline, AlignLeft, AlignCenter, AlignRight, List as ListIcon,
  Users, Bell, Folder, Home
} from 'lucide-react';
import { WorkspaceEmail, WorkspaceFile, WorkspaceEvent } from '../types';

// --- INITIAL DATA ---
// ... (Initial Data Constants remain same) ...
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

// --- 1. EMAIL APP INTERACTIVE ---
const EmailApp = ({ onComposeReply, searchQuery }: { onComposeReply?: (email: WorkspaceEmail) => void, searchQuery: string }) => {
  const [emails, setEmails] = useState<WorkspaceEmail[]>(INITIAL_EMAILS);
  const [selectedEmail, setSelectedEmail] = useState<WorkspaceEmail | null>(null);
  const [composing, setComposing] = useState(false);
  const [activeFolder, setActiveFolder] = useState<'inbox' | 'sent' | 'trash'>('inbox');
  const [newEmail, setNewEmail] = useState({ to: '', subject: '', body: '' });

  // ... Filter Logic ...
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
        className={`flex items-center gap-3 w-full px-4 py-3.5 rounded-xl transition-all min-h-[48px] ${
            activeFolder === id 
            ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-white font-bold' 
            : 'text-gray-500 hover:bg-gray-100/50 dark:hover:bg-gray-800/50'
        }`}
      >
          <Icon size={20}/>
          <span className="text-sm font-medium">{label}</span>
          {id === 'inbox' && <span className="ml-auto text-[10px] font-bold bg-blue-600 text-white px-2 py-0.5 rounded-full">{emails.filter(e => e.folder === 'inbox' && !e.read).length}</span>}
      </button>
  );

  return (
    <div className="flex h-full bg-white/90 dark:bg-gray-900/90 backdrop-blur-xl rounded-[2rem] overflow-hidden border border-white/40 dark:border-white/10 relative shadow-inner">
      
      {/* Compose Modal */}
      {composing && (
          <div className="absolute inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center p-4">
              <div className="bg-white dark:bg-gray-900 w-full max-w-lg rounded-3xl shadow-2xl flex flex-col overflow-hidden animate-in zoom-in-95 duration-200 border border-white/20">
                  <div className="p-5 border-b border-gray-100 dark:border-gray-800 flex justify-between items-center bg-gray-50 dark:bg-gray-800/50">
                      <h3 className="font-bold text-gray-700 dark:text-gray-200">Nova Mensagem</h3>
                      <button onClick={() => setComposing(false)} className="p-2 bg-gray-200 dark:bg-gray-700 rounded-full text-gray-500 hover:text-red-500 transition-colors"><X size={18}/></button>
                  </div>
                  <div className="p-5 space-y-4">
                      <input 
                        placeholder="Para" 
                        value={newEmail.to}
                        onChange={e => setNewEmail({...newEmail, to: e.target.value})}
                        className="w-full p-3 bg-gray-50 dark:bg-gray-800 rounded-xl outline-none text-sm font-bold text-gray-900 dark:text-white"
                      />
                      <input 
                        placeholder="Assunto" 
                        value={newEmail.subject}
                        onChange={e => setNewEmail({...newEmail, subject: e.target.value})}
                        className="w-full p-3 bg-gray-50 dark:bg-gray-800 rounded-xl outline-none text-sm font-bold text-gray-900 dark:text-white"
                      />
                      <textarea 
                        placeholder="Escreva sua mensagem..." 
                        value={newEmail.body}
                        onChange={e => setNewEmail({...newEmail, body: e.target.value})}
                        className="w-full h-48 p-3 bg-gray-50 dark:bg-gray-800 rounded-xl outline-none text-sm resize-none text-gray-900 dark:text-white"
                      ></textarea>
                  </div>
                  <div className="p-5 border-t border-gray-100 dark:border-gray-800 flex justify-end gap-3">
                      <button onClick={() => setComposing(false)} className="px-6 py-3 text-gray-500 font-bold text-xs hover:bg-gray-100 dark:hover:bg-gray-800 rounded-xl transition-colors">Cancelar</button>
                      <button onClick={handleSend} className="px-8 py-3 bg-blue-600 text-white font-bold text-xs rounded-xl hover:bg-blue-700 flex items-center gap-2 shadow-lg active:scale-95 transition-all">
                          <Send size={16}/> Enviar
                      </button>
                  </div>
              </div>
          </div>
      )}

      {/* Sidebar List with Folders */}
      <div className={`w-full md:w-1/3 border-r border-gray-200/50 dark:border-white/10 flex flex-col ${selectedEmail ? 'hidden md:flex' : 'flex'}`}>
        <div className="p-5 space-y-3 border-b border-gray-200/50 dark:border-white/10">
            <button onClick={() => { setNewEmail({to:'',subject:'',body:''}); setComposing(true); }} className="w-full py-4 bg-blue-600 text-white rounded-xl hover:bg-blue-700 transition-colors shadow-lg shadow-blue-500/30 font-bold text-sm flex items-center justify-center gap-2 min-h-[50px] active:scale-[0.98]">
                <Plus size={20}/> Nova Mensagem
            </button>
            <div className="flex flex-col gap-1.5 mt-2">
                <FolderButton id="inbox" label="Caixa de Entrada" icon={Inbox}/>
                <FolderButton id="sent" label="Enviados" icon={Send}/>
                <FolderButton id="trash" label="Lixeira" icon={Trash2}/>
            </div>
        </div>
        
        <div className="flex-1 overflow-y-auto p-2">
            {filteredEmails.length === 0 && <div className="text-center p-8 text-gray-400 text-xs font-bold uppercase tracking-widest">Pasta vazia</div>}
            {filteredEmails.map(email => (
                <div 
                    key={email.id} 
                    onClick={() => { setSelectedEmail(email); if(email.folder==='inbox') setEmails(prev => prev.map(e => e.id === email.id ? {...e, read: true} : e)); }}
                    className={`p-4 mb-1 rounded-xl cursor-pointer hover:bg-gray-100 dark:hover:bg-white/5 transition-colors min-h-[90px] flex flex-col justify-center border border-transparent ${selectedEmail?.id === email.id ? 'bg-blue-50 dark:bg-blue-900/20 border-blue-100 dark:border-blue-800' : ''}`}
                >
                    <div className="flex justify-between mb-1.5">
                        <span className={`font-bold text-sm ${!email.read && email.folder==='inbox' ? 'text-blue-600 dark:text-blue-400' : 'text-gray-700 dark:text-gray-300'}`}>{email.from}</span>
                        <span className="text-[10px] font-bold text-gray-400 uppercase">{email.date}</span>
                    </div>
                    <p className={`text-sm mb-1.5 truncate ${!email.read && email.folder==='inbox' ? 'font-black text-gray-900 dark:text-white' : 'font-medium text-gray-600 dark:text-gray-400'}`}>{email.subject}</p>
                    <p className="text-xs text-gray-400 truncate font-medium">{email.preview}</p>
                </div>
            ))}
        </div>
      </div>

      {/* Email Detail */}
      <div className={`flex-1 flex flex-col bg-gray-50/50 dark:bg-gray-800/50 ${!selectedEmail ? 'hidden md:flex items-center justify-center' : 'flex'}`}>
          {selectedEmail ? (
              <>
                <div className="p-6 border-b border-gray-200/50 dark:border-white/10 bg-white/60 dark:bg-gray-900/60 flex justify-between items-start backdrop-blur-sm">
                    <div>
                        <button onClick={() => setSelectedEmail(null)} className="md:hidden mb-4 text-blue-500 flex items-center gap-1 text-xs font-bold p-2 -ml-2 bg-blue-50 rounded-lg"><ChevronLeft size={16}/> Voltar</button>
                        <h2 className="text-2xl font-black text-gray-900 dark:text-white mb-2 leading-tight">{selectedEmail.subject}</h2>
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-full bg-blue-100 dark:bg-blue-900 text-blue-600 flex items-center justify-center font-black text-sm">{selectedEmail.from[0]}</div>
                            <div>
                                <p className="text-sm font-bold text-gray-800 dark:text-gray-200">{selectedEmail.from}</p>
                                <p className="text-xs text-gray-400 font-medium">para mim</p>
                            </div>
                        </div>
                    </div>
                    <div className="flex gap-2">
                        {activeFolder === 'trash' ? (
                            <button onClick={() => handlePermanentDelete(selectedEmail.id)} className="p-3 text-red-500 bg-red-50 hover:bg-red-100 dark:bg-red-900/20 dark:hover:bg-red-900/30 rounded-xl transition-colors" title="Excluir Permanentemente"><X size={20}/></button>
                        ) : (
                            <button onClick={() => handleMoveToTrash(selectedEmail.id)} className="p-3 text-gray-400 hover:text-red-500 bg-white dark:bg-white/5 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-xl transition-colors shadow-sm"><Trash2 size={20}/></button>
                        )}
                    </div>
                </div>
                <div className="p-8 flex-1 overflow-y-auto font-medium text-gray-700 dark:text-gray-300 leading-loose whitespace-pre-wrap text-base">
                    {selectedEmail.preview}
                    {'\n\n'}
                    Lorem ipsum dolor sit amet, consectetur adipiscing elit. Sed do eiusmod tempor incididunt ut labore et dolore magna aliqua. Ut enim ad minim veniam, quis nostrud exercitation ullamco laboris nisi ut aliquip ex ea commodo consequat.
                </div>
                <div className="p-5 border-t border-gray-200/50 dark:border-white/10 bg-white/60 dark:bg-gray-900/60 flex gap-3 backdrop-blur-sm">
                    {activeFolder !== 'trash' && (
                        <button onClick={handleReply} className="flex-1 py-4 bg-blue-600 rounded-xl text-sm font-bold text-white hover:bg-blue-700 flex items-center justify-center gap-2 shadow-lg transition-transform active:scale-[0.98]"><Send size={18}/> Responder</button>
                    )}
                </div>
              </>
          ) : (
              <div className="text-center text-gray-400">
                  <div className="w-24 h-24 bg-gray-100 dark:bg-white/5 rounded-full flex items-center justify-center mx-auto mb-6">
                      <Mail size={48} className="opacity-20"/>
                  </div>
                  <p className="text-sm font-bold uppercase tracking-widest opacity-60">Selecione uma mensagem</p>
              </div>
          )}
      </div>
    </div>
  );
};

// ... CalendarApp (Standardized) ...
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
        <div className="h-full flex flex-col bg-white/85 dark:bg-gray-900/85 backdrop-blur-xl rounded-[2rem] overflow-hidden border border-white/40 dark:border-white/10 relative shadow-inner">
            {selectedEvent && (
                <div className="absolute inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-6 animate-in fade-in" onClick={() => setSelectedEvent(null)}>
                    <div className="bg-white dark:bg-gray-900 w-full max-w-sm rounded-[2.5rem] p-8 shadow-2xl relative border border-gray-100 dark:border-gray-700" onClick={e => e.stopPropagation()}>
                        <button onClick={() => setSelectedEvent(null)} className="absolute top-6 right-6 p-3 bg-gray-100 dark:bg-gray-800 rounded-full hover:bg-gray-200 transition-colors"><X size={20}/></button>
                        <div className={`w-16 h-16 rounded-3xl flex items-center justify-center mb-6 shadow-sm ${
                            selectedEvent.type === 'Sessão' ? 'bg-green-100 text-green-600' :
                            selectedEvent.type === 'Reunião' ? 'bg-blue-100 text-blue-600' :
                            'bg-yellow-100 text-yellow-600'
                        }`}>
                            <Calendar size={32}/>
                        </div>
                        <h3 className="text-2xl font-black text-gray-900 dark:text-white mb-2 leading-tight">{selectedEvent.title}</h3>
                        <p className="text-sm font-bold text-gray-500 uppercase mb-8 tracking-wide">{selectedEvent.type} • {selectedEvent.time}</p>
                        <button onClick={() => { setEvents(events.filter(e => e.id !== selectedEvent.id)); setSelectedEvent(null); }} className="w-full py-4 border-2 border-red-100 text-red-500 font-bold rounded-2xl hover:bg-red-50 transition-colors text-xs flex items-center justify-center gap-2 uppercase tracking-wider">
                            <Trash2 size={18}/> Cancelar Evento
                        </button>
                    </div>
                </div>
            )}
            
            <div className="p-6 md:p-8 border-b border-gray-100 dark:border-gray-800 flex justify-between items-center bg-gray-50/50 dark:bg-white/5">
                <h3 className="font-black text-gray-800 dark:text-white text-2xl tracking-tight">Outubro 2023</h3>
                <div className="flex gap-3">
                    <button className="p-3 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-full hover:bg-gray-50 transition-colors"><ChevronLeft size={20}/></button>
                    <button className="p-3 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-full hover:bg-gray-50 transition-colors"><ChevronRight size={20}/></button>
                    <button onClick={() => setCurrentDay(new Date().getDate())} className="px-6 py-3 bg-blue-600 text-white rounded-full font-bold text-xs uppercase tracking-wider shadow-lg hover:bg-blue-700 transition-colors">Hoje</button>
                </div>
            </div>
            
            <div className="flex-1 grid grid-cols-7 grid-rows-5 gap-px bg-gray-200/50 dark:bg-gray-800/50 backdrop-blur-sm p-px">
                {Array.from({length: 31}, (_, i) => i + 1).map(day => {
                    const dayEvents = events.filter(e => e.day === day);
                    const visibleEvents = searchQuery ? dayEvents.filter(e => e.title.toLowerCase().includes(searchQuery.toLowerCase())) : dayEvents;
                    const isSelected = day === currentDay;
                    const isSearchMatch = searchMatchDays.includes(day);

                    return (
                        <div 
                            key={day} 
                            onClick={() => setCurrentDay(day)}
                            className={`bg-white dark:bg-gray-900 min-h-[80px] p-3 relative group hover:bg-gray-50 dark:hover:bg-black transition-colors cursor-pointer flex flex-col ${isSelected ? 'bg-blue-50/30 dark:bg-blue-900/10' : ''} ${isSearchMatch ? 'bg-yellow-50/50 dark:bg-yellow-900/10' : ''}`}
                        >
                            <span className={`text-xs font-black mb-2 ${isSelected ? 'bg-blue-600 text-white w-8 h-8 flex items-center justify-center rounded-full shadow-md' : 'text-gray-400'}`}>{day}</span>
                            <div className="flex-1 space-y-1.5 w-full">
                                {visibleEvents.map(ev => (
                                    <div 
                                        key={ev.id} 
                                        onClick={(e) => { e.stopPropagation(); setSelectedEvent(ev); }}
                                        className={`text-[9px] px-2 py-1.5 rounded-lg truncate font-bold hover:opacity-80 transition-opacity cursor-pointer shadow-sm ${
                                        ev.type === 'Sessão' ? 'bg-green-100 text-green-700 dark:bg-green-900/40 dark:text-green-300' :
                                        ev.type === 'Reunião' ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300' :
                                        'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/40 dark:text-yellow-300'
                                    }`}>
                                        {ev.time} {ev.title}
                                    </div>
                                ))}
                            </div>
                            {isSelected && !searchQuery && (
                                <div className="absolute inset-x-2 bottom-2 bg-white dark:bg-gray-800 p-2 rounded-xl flex gap-2 shadow-xl opacity-0 group-hover:opacity-100 transition-opacity z-10 border border-gray-100 dark:border-gray-700" onClick={e => e.stopPropagation()}>
                                    <input 
                                        value={newEventTitle}
                                        onChange={e => setNewEventTitle(e.target.value)}
                                        placeholder="Novo..."
                                        className="w-full text-xs font-medium bg-transparent outline-none text-gray-900 dark:text-white"
                                        onKeyDown={e => e.key === 'Enter' && handleAddEvent()}
                                    />
                                    <button onClick={handleAddEvent} className="bg-blue-600 text-white p-1.5 rounded-lg hover:bg-blue-700"><Plus size={14}/></button>
                                </div>
                            )}
                        </div>
                    )
                })}
            </div>
        </div>
    );
};

// ... DriveApp (Standardized) ...
interface DriveAppProps {
  onOpenFile: (file: WorkspaceFile) => void;
  searchQuery: string;
}

const DriveApp: React.FC<DriveAppProps> = ({ onOpenFile, searchQuery }) => {
    // ... logic remains same ...
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
        <div className="h-full flex flex-col bg-white/85 dark:bg-gray-900/85 backdrop-blur-xl rounded-[2rem] overflow-hidden border border-white/40 dark:border-white/10 p-6 md:p-8 shadow-inner">
            <div className="flex justify-between items-center mb-8">
                <div>
                    <h3 className="font-black text-gray-800 dark:text-white text-2xl tracking-tight">
                        {currentFolderId ? currentFolder?.name : 'Meus Arquivos'}
                    </h3>
                    <div className="flex items-center gap-2 text-xs text-gray-400 mt-2 font-bold uppercase tracking-wide">
                        <button onClick={() => setCurrentFolderId(null)} className="hover:text-blue-500 cursor-pointer flex items-center gap-1 p-1 hover:bg-gray-100 dark:hover:bg-white/10 rounded">
                            <Home size={12}/> Início
                        </button>
                        {currentFolderId && (
                            <>
                                <ChevronRight size={12}/>
                                <span className="text-gray-600 dark:text-gray-300">{currentFolder?.name}</span>
                            </>
                        )}
                    </div>
                </div>
                <button 
                    onClick={() => fileInputRef.current?.click()}
                    className="flex items-center gap-2 px-6 py-3.5 bg-blue-600 text-white rounded-xl font-black text-xs uppercase tracking-widest shadow-lg hover:bg-blue-700 transition-colors active:scale-95"
                >
                    <Plus size={18}/> Upload
                </button>
                <input type="file" ref={fileInputRef} className="hidden" onChange={handleUpload} />
            </div>
            
            <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-6 overflow-y-auto pb-10 custom-scrollbar">
                {filteredFiles.length === 0 && <div className="col-span-full text-center py-12 text-gray-400 text-xs font-bold uppercase tracking-widest opacity-50">Pasta vazia.</div>}
                
                {filteredFiles.map(file => (
                    <div 
                        key={file.id} 
                        onClick={() => file.type === 'folder' ? setCurrentFolderId(file.id) : onOpenFile(file)}
                        className="group p-6 rounded-3xl border border-gray-100/50 dark:border-white/10 hover:border-blue-400 hover:shadow-xl transition-all cursor-pointer bg-white/60 dark:bg-gray-800/60 backdrop-blur-sm flex flex-col items-center text-center relative min-h-[160px] justify-between active:scale-[0.98]"
                    >
                        <div className="absolute top-3 right-3 opacity-0 group-hover:opacity-100 transition-opacity flex gap-1">
                            <button onClick={(e) => { e.stopPropagation(); handleDelete(file.id); }} className="p-2 hover:bg-red-100 hover:text-red-500 rounded-full text-gray-400 transition-colors"><Trash2 size={16}/></button>
                        </div>
                        <div className={`w-20 h-20 rounded-2xl flex items-center justify-center mb-4 backdrop-blur-md shadow-sm ${
                            file.type === 'doc' ? 'bg-blue-100/50 text-blue-600' :
                            file.type === 'sheet' ? 'bg-green-100/50 text-green-600' :
                            file.type === 'slide' ? 'bg-orange-100/50 text-orange-600' :
                            file.type === 'pdf' ? 'bg-red-100/50 text-red-600' :
                            'bg-yellow-100/50 text-yellow-600'
                        }`}>
                            {file.type === 'doc' && <FileText size={32}/>}
                            {file.type === 'sheet' && <Table size={32}/>}
                            {file.type === 'slide' && <Presentation size={32}/>}
                            {file.type === 'pdf' && <FileText size={32}/>}
                            {file.type === 'folder' && <Folder size={32}/>}
                        </div>
                        <div className="w-full">
                            <p className="text-sm font-bold text-gray-800 dark:text-white truncate w-full mb-1">{file.name}</p>
                            <p className="text-[10px] text-gray-400 font-bold uppercase tracking-wide">{file.size}</p>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
};

// ... MeetApp (with standardized padding and layout)
const MeetApp = () => {
    // ... logic remains same ...
    const [micOn, setMicOn] = useState(false);
    const [camOn, setCamOn] = useState(true);
    const [showChat, setShowChat] = useState(false);
    const [showParticipants, setShowParticipants] = useState(false);
    const [chatMsg, setChatMsg] = useState('');
    const [messages, setMessages] = useState<{user: string, text: string}[]>([
        {user: 'Dep. Silva', text: 'Bom dia a todos, podemos começar?'}
    ]);

    const handleSendChat = () => {
        if (!chatMsg) return;
        setMessages([...messages, { user: 'Eu', text: chatMsg }]);
        setChatMsg('');
    };

    return (
        <div className="h-full flex flex-col bg-gray-900 rounded-[2rem] overflow-hidden relative border border-white/10 shadow-2xl">
            <div className="absolute top-6 left-6 z-10 bg-black/60 backdrop-blur-md px-5 py-2.5 rounded-full text-white font-black text-xs border border-white/10 flex items-center gap-2 uppercase tracking-widest shadow-lg">
                <div className="w-2.5 h-2.5 bg-red-500 rounded-full animate-pulse shadow-[0_0_10px_red]"></div>
                Plenário Virtual
            </div>
            
            <div className="flex-1 grid grid-cols-2 gap-2 p-2 relative">
                {/* ... Video Grid ... */}
                <div className="bg-gray-800 rounded-3xl relative overflow-hidden">
                    <img src="https://images.unsplash.com/photo-1560250097-0b93528c311a?auto=format&fit=crop&w=400&q=80" className="w-full h-full object-cover opacity-80" alt=""/>
                    <div className="absolute bottom-3 left-3 text-white text-[10px] font-bold bg-black/60 backdrop-blur-sm px-3 py-1.5 rounded-lg border border-white/10">Dep. Silva</div>
                </div>
                <div className="bg-gray-800 rounded-3xl relative overflow-hidden">
                    <img src="https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?auto=format&fit=crop&w=400&q=80" className="w-full h-full object-cover opacity-80" alt=""/>
                    <div className="absolute bottom-3 left-3 text-white text-[10px] font-bold bg-black/60 backdrop-blur-sm px-3 py-1.5 rounded-lg border border-white/10">Sen. Oliveira</div>
                </div>
                <div className="bg-gray-800 rounded-3xl relative overflow-hidden">
                    <img src="https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=400&q=80" className="w-full h-full object-cover opacity-80" alt=""/>
                    <div className="absolute bottom-3 left-3 text-white text-[10px] font-bold bg-black/60 backdrop-blur-sm px-3 py-1.5 rounded-lg border border-white/10">Min. Costa</div>
                </div>
                <div className="bg-gray-900 rounded-3xl flex items-center justify-center relative border border-gray-800 overflow-hidden">
                    {camOn ? (
                        <div className="absolute inset-0 bg-gradient-to-br from-gray-800 to-black flex items-center justify-center">
                            <span className="text-gray-500 text-xs font-bold uppercase tracking-widest">Sua Câmera</span>
                        </div>
                    ) : (
                        <div className="w-24 h-24 rounded-full bg-blue-600 flex items-center justify-center text-white font-black text-3xl shadow-lg">EU</div>
                    )}
                    <div className="absolute bottom-3 left-3 text-white text-[10px] font-bold bg-black/60 backdrop-blur-sm px-3 py-1.5 rounded-lg border border-white/10 flex items-center gap-2">
                        Você {!micOn && '(Mudo)'}
                    </div>
                </div>

                {/* SIDEBAR OVERLAY (Chat/Participants) */}
                {(showChat || showParticipants) && (
                    <div className="absolute right-4 top-4 bottom-4 w-80 bg-black/90 backdrop-blur-2xl border border-white/10 rounded-[2rem] flex flex-col z-20 animate-in slide-in-from-right shadow-2xl">
                        <div className="flex justify-between items-center p-5 border-b border-white/10">
                            <h3 className="font-bold text-white text-sm">{showChat ? 'Chat da Reunião' : 'Participantes (4)'}</h3>
                            <button onClick={() => { setShowChat(false); setShowParticipants(false); }} className="p-2 hover:bg-white/10 rounded-full transition-colors"><X size={18} className="text-gray-400 hover:text-white"/></button>
                        </div>
                        
                        {showChat && (
                            <>
                                <div className="flex-1 overflow-y-auto p-5 space-y-4">
                                    {messages.map((m, i) => (
                                        <div key={i} className="text-xs">
                                            <span className="font-black text-blue-400 block mb-1">{m.user}</span>
                                            <span className="text-gray-300 font-medium leading-relaxed">{m.text}</span>
                                        </div>
                                    ))}
                                </div>
                                <div className="p-4 border-t border-white/10 flex gap-2">
                                    <input 
                                        className="flex-1 bg-gray-800/50 rounded-xl px-4 py-3 text-xs text-white outline-none border border-white/5 focus:border-white/20 transition-colors"
                                        placeholder="Digite..."
                                        value={chatMsg}
                                        onChange={e => setChatMsg(e.target.value)}
                                        onKeyDown={e => e.key === 'Enter' && handleSendChat()}
                                    />
                                    <button onClick={handleSendChat} className="bg-blue-600 p-3 rounded-xl text-white hover:bg-blue-500 transition-colors"><Send size={16}/></button>
                                </div>
                            </>
                        )}

                        {showParticipants && (
                            <div className="flex-1 overflow-y-auto p-5 space-y-4">
                                {['Dep. Silva', 'Sen. Oliveira', 'Min. Costa', 'Você'].map((name, i) => (
                                    <div key={i} className="flex items-center gap-3 text-white text-xs p-2 hover:bg-white/5 rounded-xl transition-colors">
                                        <div className="w-10 h-10 rounded-full bg-gray-800 flex items-center justify-center font-bold text-sm border border-white/5">{name[0]}</div>
                                        <span className="font-bold">{name}</span>
                                        {name === 'Você' && !micOn && <MicOff size={14} className="ml-auto text-red-500"/>}
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                )}
            </div>
            
            <div className="h-28 bg-black/80 backdrop-blur-xl flex items-center justify-center gap-6 border-t border-white/10">
                <button onClick={() => setMicOn(!micOn)} className={`p-5 rounded-full transition-all duration-300 ${micOn ? 'bg-gray-800 text-white hover:bg-gray-700 border border-white/10' : 'bg-red-500/20 text-red-500 hover:bg-red-500 hover:text-white border border-red-500/30'}`}>{micOn ? <Mic size={24}/> : <MicOff size={24}/>}</button>
                <button onClick={() => setCamOn(!camOn)} className={`p-5 rounded-full transition-all duration-300 ${camOn ? 'bg-gray-800 text-white hover:bg-gray-700 border border-white/10' : 'bg-red-500/20 text-red-500 hover:bg-red-500 hover:text-white border border-red-500/30'}`}>{camOn ? <Camera size={24}/> : <CameraOff size={24}/>}</button>
                <button className="p-5 rounded-full bg-red-600 text-white hover:bg-red-700 transition-all shadow-lg hover:shadow-red-900/50 scale-110 mx-4 active:scale-95"><PhoneOff size={32}/></button>
                <button onClick={() => { setShowChat(!showChat); setShowParticipants(false); }} className={`p-5 rounded-full transition-all duration-300 ${showChat ? 'bg-blue-600 text-white shadow-lg' : 'bg-gray-800 text-white hover:bg-gray-700 border border-white/10'}`}><MessageSquare size={24}/></button>
                <button onClick={() => { setShowParticipants(!showParticipants); setShowChat(false); }} className={`p-5 rounded-full transition-all duration-300 ${showParticipants ? 'bg-blue-600 text-white shadow-lg' : 'bg-gray-800 text-white hover:bg-gray-700 border border-white/10'}`}><Users size={24}/></button>
            </div>
        </div>
    );
};

// ... EditorApp (unchanged but ensure wrapping div has correct padding) ...
const EditorApp = ({ type, file }: { type: 'doc' | 'sheet', file?: WorkspaceFile }) => {
    // ... logic same ...
    const [fileName, setFileName] = useState(file?.name || (type === 'doc' ? 'Novo Documento' : 'Nova Planilha'));
    const [cells, setCells] = useState<string[][]>([
        ['Passagens', '2500', '10/10/23', 'Pago'],
        ['Hospedagem', '1200', '11/10/23', 'Pendente'],
        ['Divulgação', '5000', '12/10/23', 'Pago'],
        ['Combustível', '350', '13/10/23', 'Pago'],
        ['TOTAL', '0', '', '']
    ]);

    useEffect(() => {
        if (type === 'sheet') {
            const lastRowIndex = cells.length - 1;
            const sum = cells.slice(0, lastRowIndex).reduce((acc, row) => {
                const val = parseFloat(row[1].replace('R$', '').replace('.', '').replace(',', '.'));
                return acc + (isNaN(val) ? 0 : val);
            }, 0);
            
            const currentTotal = cells[lastRowIndex][1];
            const formattedTotal = sum.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
            
            if (currentTotal !== formattedTotal) {
                const newCells = [...cells];
                newCells[lastRowIndex][1] = formattedTotal;
                setCells(newCells);
            }
        }
    }, [cells, type]);

    const handleCellChange = (rowIndex: number, colIndex: number, val: string) => {
        const newCells = [...cells];
        newCells[rowIndex][colIndex] = val;
        setCells(newCells);
    };

    const handleAddRow = () => {
        const newCells = [...cells];
        const lastRow = newCells.pop();
        newCells.push(['Nova Despesa', '0', '', '']);
        if(lastRow) newCells.push(lastRow);
        setCells(newCells);
    };

    const handleDeleteRow = (index: number) => {
        if (index === cells.length - 1) return;
        const newCells = cells.filter((_, i) => i !== index);
        setCells(newCells);
    };
    
    const execCmd = (command: string) => {
        document.execCommand(command, false, undefined);
    };

    return (
        <div className="h-full flex flex-col bg-white dark:bg-gray-900 rounded-[2rem] overflow-hidden border border-gray-200 dark:border-gray-700 shadow-inner">
            <div className="flex flex-col border-b border-gray-100 dark:border-gray-800 bg-gray-50 dark:bg-gray-900/50">
                <div className="p-5 flex justify-between items-center">
                    <div className="flex items-center gap-4">
                        <div className={`p-2.5 rounded-xl text-white shadow-sm ${type === 'doc' ? 'bg-blue-600' : 'bg-green-600'}`}>
                            {type === 'doc' ? <FileText size={24}/> : <Table size={24}/>}
                        </div>
                        <div>
                            <input 
                                value={fileName}
                                onChange={e => setFileName(e.target.value)}
                                className="font-bold text-gray-800 dark:text-white text-base bg-transparent outline-none border-b border-transparent focus:border-blue-500 transition-colors py-1"
                            />
                            <div className="flex gap-4 text-[10px] text-gray-500 mt-1 font-bold uppercase tracking-wide">
                                <span className="hover:text-blue-500 cursor-pointer">Arquivo</span>
                                <span className="hover:text-blue-500 cursor-pointer">Editar</span>
                                <span className="hover:text-blue-500 cursor-pointer">Ver</span>
                            </div>
                        </div>
                    </div>
                    <button className="px-6 py-3 bg-blue-100 dark:bg-blue-900/30 text-blue-600 dark:text-blue-300 rounded-xl text-xs font-bold flex items-center gap-2 hover:bg-blue-200 transition-colors uppercase tracking-wider">
                        <Users size={16}/> Compartilhar
                    </button>
                </div>
                
                <div className="px-5 pb-4 flex gap-4 overflow-x-auto scrollbar-hide items-center">
                    <div className="flex gap-1">
                        <button onClick={() => execCmd('bold')} className="p-2.5 hover:bg-gray-200 dark:hover:bg-gray-700 rounded-lg text-gray-600 dark:text-gray-300 transition-colors"><Bold size={18}/></button>
                        <button onClick={() => execCmd('italic')} className="p-2.5 hover:bg-gray-200 dark:hover:bg-gray-700 rounded-lg text-gray-600 dark:text-gray-300 transition-colors"><Italic size={18}/></button>
                        <button onClick={() => execCmd('underline')} className="p-2.5 hover:bg-gray-200 dark:hover:bg-gray-700 rounded-lg text-gray-600 dark:text-gray-300 transition-colors"><Underline size={18}/></button>
                    </div>
                    <div className="w-px bg-gray-300 dark:bg-gray-700 h-6"></div>
                    <div className="flex gap-1">
                        <button onClick={() => execCmd('justifyLeft')} className="p-2.5 hover:bg-gray-200 dark:hover:bg-gray-700 rounded-lg text-gray-600 dark:text-gray-300 transition-colors"><AlignLeft size={18}/></button>
                        <button onClick={() => execCmd('justifyCenter')} className="p-2.5 hover:bg-gray-200 dark:hover:bg-gray-700 rounded-lg text-gray-600 dark:text-gray-300 transition-colors"><AlignCenter size={18}/></button>
                        <button onClick={() => execCmd('justifyRight')} className="p-2.5 hover:bg-gray-200 dark:hover:bg-gray-700 rounded-lg text-gray-600 dark:text-gray-300 transition-colors"><AlignRight size={18}/></button>
                    </div>
                </div>
            </div>
            
            <div className="flex-1 p-8 md:p-12 bg-gray-100 dark:bg-[#0f172a] overflow-y-auto flex justify-center custom-scrollbar">
                <div className="w-full max-w-4xl bg-white dark:bg-[#1a1a1a] min-h-[800px] shadow-2xl p-16 outline-none text-gray-800 dark:text-gray-200 font-serif relative" contentEditable={type === 'doc'} suppressContentEditableWarning>
                    {type === 'doc' ? (
                        <>
                            <h1 className="text-4xl font-bold mb-6 text-black dark:text-white leading-tight">{file?.name ? file.name.replace('.docx','') : 'Novo Projeto de Lei'}</h1>
                            <p className="mb-8 italic text-gray-500 font-medium">Autor: Gabinete Oficial</p>
                            <p className="mb-6 font-bold text-justify text-lg">Dispõe sobre medidas de transparência digital no setor público.</p>
                            <p className="mb-4 text-justify indent-10 leading-loose text-lg">O Congresso Nacional decreta:</p>
                            <p className="mb-4 text-justify indent-10 leading-loose text-lg">Art. 1º Fica instituído o Programa de Transparência...</p>
                            <p className="mb-4 text-justify indent-10 leading-loose text-lg">Art. 2º Todos os dados devem ser disponibilizados em formato aberto...</p>
                        </>
                    ) : (
                        <div className="flex flex-col">
                            <div className="grid grid-cols-4 gap-0 border-t border-l border-gray-300 dark:border-gray-700 font-sans text-xs select-none relative shadow-sm">
                                {['CATEGORIA', 'VALOR (R$)', 'DATA', 'STATUS'].map(h => (
                                    <div key={h} className="p-4 border-r border-b border-gray-300 dark:border-gray-700 font-black bg-gray-50 dark:bg-gray-800 flex items-center justify-center uppercase tracking-wider text-gray-600 dark:text-gray-400">{h}</div>
                                ))}
                                {cells.map((row, rowIndex) => 
                                    row.map((cell, colIndex) => {
                                        const isTotal = rowIndex === cells.length - 1;
                                        return (
                                            <div key={`${rowIndex}-${colIndex}`} className={`border-r border-b border-gray-300 dark:border-gray-700 p-0 relative group/cell ${isTotal ? 'bg-yellow-50 dark:bg-yellow-900/10 font-bold' : 'bg-white dark:bg-[#1a1a1a]'}`}>
                                                <input 
                                                    value={cell}
                                                    readOnly={isTotal && colIndex === 1}
                                                    onChange={(e) => handleCellChange(rowIndex, colIndex, e.target.value)}
                                                    className={`w-full h-full p-4 bg-transparent outline-none focus:bg-blue-50 dark:focus:bg-blue-900/20 text-center font-medium ${isTotal ? 'font-black text-gray-900 dark:text-white text-base' : 'text-gray-700 dark:text-gray-300'}`}
                                                />
                                                {!isTotal && colIndex === 0 && (
                                                    <button 
                                                        onClick={() => handleDeleteRow(rowIndex)}
                                                        className="absolute -left-10 top-1/2 -translate-y-1/2 opacity-0 group-hover/cell:opacity-100 p-2 text-red-400 hover:text-red-600 transition-opacity bg-white dark:bg-gray-800 shadow-md rounded-full"
                                                        title="Remover Linha"
                                                    >
                                                        <Trash2 size={16} />
                                                    </button>
                                                )}
                                            </div>
                                        )
                                    })
                                )}
                            </div>
                            <button 
                                onClick={handleAddRow}
                                className="mt-6 self-start flex items-center gap-2 px-6 py-3 text-xs font-black uppercase tracking-widest text-green-600 bg-green-50 dark:bg-green-900/20 rounded-xl hover:bg-green-100 dark:hover:bg-green-900/40 transition-colors shadow-sm"
                            >
                                <Plus size={16}/> Adicionar Linha
                            </button>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

// ... WorkspaceView Container (Unchanged except padding) ...
const WorkspaceView: React.FC = () => {
    const [activeApp, setActiveApp] = useState<'mail' | 'calendar' | 'drive' | 'meet' | 'docs' | 'sheets'>('mail');
    const [currentFile, setCurrentFile] = useState<WorkspaceFile | undefined>(undefined);
    const [searchQuery, setSearchQuery] = useState('');
    const [showNotifications, setShowNotifications] = useState(false);

    const handleOpenFile = (file: WorkspaceFile) => {
        setCurrentFile(file);
        if (file.type === 'doc' || file.type === 'pdf') setActiveApp('docs');
        else if (file.type === 'sheet') setActiveApp('sheets');
        else if (file.type === 'slide') setActiveApp('drive'); 
    };

    const AppIcon = ({ id, icon: Icon, label, color }: any) => (
        <button 
            onClick={() => { setActiveApp(id); if(id !== 'docs' && id !== 'sheets') setCurrentFile(undefined); }}
            className={`flex flex-col items-center gap-1.5 p-3 rounded-2xl transition-all min-w-[70px] ${
                activeApp === id 
                ? 'bg-white/80 dark:bg-gray-800/80 shadow-lg scale-105 backdrop-blur-md ring-1 ring-black/5 dark:ring-white/10' 
                : 'hover:bg-white/50 dark:hover:bg-gray-800/50 opacity-70 hover:opacity-100'
            }`}
        >
            <div className={`p-3.5 rounded-2xl text-white shadow-md ${color}`}>
                {/* Optical centering adjustment */}
                <Icon size={22} className="stroke-[2]" />
            </div>
            <span className="text-[10px] font-bold text-gray-600 dark:text-gray-400 uppercase tracking-wide">{label}</span>
        </button>
    );

    return (
        <div className="w-full h-full bg-transparent font-sans flex flex-col animate-in fade-in duration-500">
            
            {/* Header */}
            <div className="p-6 pb-4 shrink-0">
                <div className="flex flex-col xl:flex-row justify-between items-center mb-6 gap-6">
                    
                    <div className="flex-1 w-full flex items-center justify-between xl:justify-start gap-10">
                        <div>
                            <h1 className="text-4xl font-black text-gray-900 dark:text-white tracking-tight flex items-center gap-3">
                                Gabinete Digital
                            </h1>
                            <p className="text-sm font-medium text-gray-500 mt-1">Sua suíte de produtividade legislativa integrada.</p>
                        </div>

                        {/* Search */}
                        <div className="hidden md:flex flex-1 max-w-lg relative group">
                            <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 group-focus-within:text-blue-500 transition-colors" size={20}/>
                            <input 
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                placeholder={`Buscar em ${activeApp === 'mail' ? 'Emails' : activeApp === 'calendar' ? 'Eventos' : activeApp === 'drive' ? 'Arquivos' : 'Workspace'}...`}
                                className="w-full pl-12 pr-4 py-4 bg-white/70 dark:bg-gray-900/70 backdrop-blur-md rounded-2xl text-sm font-medium shadow-sm border border-transparent focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 transition-all outline-none"
                            />
                        </div>

                        {/* Notifications */}
                        <div className="relative">
                            <button 
                                onClick={() => setShowNotifications(!showNotifications)}
                                className="p-4 bg-white/70 dark:bg-gray-900/70 backdrop-blur-md rounded-full hover:bg-white/90 dark:hover:bg-gray-800/90 transition-colors relative shadow-sm border border-white/20 active:scale-95"
                            >
                                <Bell size={22} className="text-gray-600 dark:text-gray-300"/>
                                <span className="absolute top-3 right-3.5 w-2.5 h-2.5 bg-red-500 rounded-full animate-pulse border-2 border-white dark:border-gray-900"></span>
                            </button>
                            
                            {showNotifications && (
                                <div className="absolute top-full right-0 mt-3 w-80 bg-white/95 dark:bg-gray-900/95 backdrop-blur-xl rounded-[2rem] shadow-2xl border border-white/40 dark:border-white/10 overflow-hidden z-50 animate-in slide-in-from-top-2 fade-in">
                                    <div className="p-5 border-b border-gray-100/50 dark:border-gray-800 font-bold text-sm flex justify-between items-center">
                                        <span className="text-gray-900 dark:text-white">Notificações</span>
                                        <span className="text-[10px] font-black bg-blue-100 text-blue-600 px-2.5 py-1 rounded-full uppercase tracking-wide">3 Novas</span>
                                    </div>
                                    <div className="max-h-72 overflow-y-auto p-2">
                                        {[
                                            { icon: Mail, color: 'text-blue-500 bg-blue-50 dark:bg-blue-900/20', title: 'Novo Email da Liderança', time: '5 min' },
                                            { icon: Calendar, color: 'text-green-500 bg-green-50 dark:bg-green-900/20', title: 'Reunião CCJ em 30min', time: '10 min' },
                                        ].map((n, i) => (
                                            <div key={i} className="p-4 hover:bg-gray-50/80 dark:hover:bg-gray-800/50 transition-colors cursor-pointer rounded-2xl flex gap-4 mb-1">
                                                <div className={`p-2.5 rounded-full ${n.color} h-fit`}>
                                                    <n.icon size={18} />
                                                </div>
                                                <div>
                                                    <p className="text-sm font-bold text-gray-800 dark:text-white leading-tight mb-1">{n.title}</p>
                                                    <p className="text-[10px] font-bold text-gray-400 uppercase tracking-wide">{n.time} atrás</p>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                    <button className="w-full p-3 text-center text-[10px] font-black text-blue-500 hover:bg-gray-50/50 dark:hover:bg-gray-800/50 uppercase tracking-widest border-t border-gray-100 dark:border-gray-800">Ver Todas</button>
                                </div>
                            )}
                        </div>
                    </div>

                    {/* App Dock */}
                    <div className="flex gap-3 mt-4 xl:mt-0 bg-gray-100/50 dark:bg-gray-900/50 backdrop-blur-md p-2 rounded-[2.5rem] shadow-inner overflow-x-auto max-w-full shrink-0 border border-white/20 items-center justify-center">
                        <AppIcon id="mail" icon={Mail} label="Correio" color="bg-red-500" />
                        <AppIcon id="calendar" icon={Calendar} label="Agenda" color="bg-blue-500" />
                        <AppIcon id="drive" icon={HardDrive} label="Arquivos" color="bg-yellow-500" />
                        <AppIcon id="meet" icon={VideoIcon} label="Plenário" color="bg-purple-500" />
                        <AppIcon id="docs" icon={FileText} label="Editor" color="bg-blue-600" />
                        <AppIcon id="sheets" icon={Table} label="Planilhas" color="bg-green-600" />
                    </div>
                </div>
            </div>

            {/* Application Area */}
            <div className="flex-1 px-4 md:px-8 pb-4 overflow-hidden">
                <div className="w-full h-full shadow-2xl rounded-[2.5rem] overflow-hidden ring-1 ring-black/5 dark:ring-white/10 relative bg-white/50 dark:bg-black/20 backdrop-blur-sm">
                    {activeApp === 'mail' && <EmailApp searchQuery={searchQuery} />}
                    {activeApp === 'calendar' && <CalendarApp searchQuery={searchQuery} />}
                    {activeApp === 'drive' && <DriveApp onOpenFile={handleOpenFile} searchQuery={searchQuery} />}
                    {activeApp === 'meet' && <MeetApp />}
                    {activeApp === 'docs' && <EditorApp type="doc" file={currentFile} />}
                    {activeApp === 'sheets' && <EditorApp type="sheet" file={currentFile} />}
                </div>
            </div>

        </div>
    );
};

export default WorkspaceView;

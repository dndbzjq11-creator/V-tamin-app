import { useState, useRef, useEffect } from 'react';
import { Camera, Upload, Download, RefreshCw, ChevronLeft, Info, Utensils, Heart, AlertCircle, Search } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import html2canvas from 'html2canvas';
import { GoogleGenAI, Type, ThinkingLevel } from "@google/genai";
import ReactMarkdown from 'react-markdown';

// Types
interface NutritionData {
  mealName: string;
  calories: number;
  carbs: number;
  protein: number;
  fat: number;
  sodium: number;
  sugar: number;
  advice: string;
  dietScore: string;
  pros: string[];
  cons: string[];
  medicalPros: string; // 의학적으로 좋은 점
  medicalCons: string; // 의학적으로 주의할 점
  healthTip: string;
}

const INITIAL_NUTRITION: NutritionData = {
  mealName: '',
  calories: 0,
  carbs: 0,
  protein: 0,
  fat: 0,
  sodium: 0,
  sugar: 0,
  advice: '',
  dietScore: '',
  pros: [],
  cons: [],
  medicalPros: '',
  medicalCons: '',
  healthTip: ''
};

const SEARCH_ITEMS = [
  { id: 'bibimbap', name: '비빔밥', kcal: 550, keyword: 'bibimbap' },
  { id: 'kimchi', name: '김치찌개', kcal: 450, keyword: 'kimchijjigae' },
  { id: 'bulgogi', name: '불고기', kcal: 600, keyword: 'bulgogi' },
  { id: 'salad', name: '샐러드', kcal: 250, keyword: 'salad' },
  { id: 'pizza', name: '피자', kcal: 800, keyword: 'pizza' },
  { id: 'burger', name: '햄버거', kcal: 700, keyword: 'hamburger' },
  { id: 'pasta', name: '파스타', kcal: 650, keyword: 'pasta' },
  { id: 'sushi', name: '초밥', kcal: 500, keyword: 'sushi' },
  { id: 'tacos', name: '타코', kcal: 400, keyword: 'tacos' },
  { id: 'steak', name: '스테이크', kcal: 900, keyword: 'steak' },
  { id: 'chicken', name: '치킨', kcal: 1200, keyword: 'friedchicken' },
  { id: 'sandwich', name: '샌드위치', kcal: 450, keyword: 'sandwich' },
];

export default function App() {
  const [image, setImage] = useState<string | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [nutrition, setNutrition] = useState<NutritionData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [showSearch, setShowSearch] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [isTextSearch, setIsTextSearch] = useState(false);
  
  const fileInputRef = useRef<HTMLInputElement>(null);
  const captureRef = useRef<HTMLDivElement>(null);

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setImage(reader.result as string);
        setIsTextSearch(false);
        analyzeImage(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleTextSearch = async (e?: React.FormEvent, overrideTerm?: string) => {
    if (e) e.preventDefault();
    const term = overrideTerm || searchTerm;
    if (!term.trim()) return;

    setIsAnalyzing(true);
    setShowSearch(false);
    setError(null);
    setNutrition(null); // Clear previous results to prevent overlap
    setIsTextSearch(true);
    setImage(null);

    try {
      const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY! });
      
      const response = await ai.models.generateContent({
        model: "gemini-3-flash-preview",
        contents: {
          parts: [
            { text: `'${term}' 음식에 대한 영양 정보를 분석해주세요. 😊
            
            1. 모든 텍스트는 한국어로, 이모지를 섞어서 재미있게 작성해주세요.
            2. '다이어트에 도움이 될까?'(dietScore) 섹션에는 이 음식이 다이어트에 얼마나 좋은지 재미있는 한 문장으로 표현해주세요.
            3. '장점'과 '단점'을 각각 리스트 형태로 추출해주세요.
            4. '의학적 분석'(medicalPros, medicalCons) 섹션에는 이 음식이 의학적으로 우리 몸의 어디에 좋은지, 그리고 과하게 먹었을 때 어디에 안 좋을 수 있는지 설명해주세요.
            5. '영양사의 조언'(advice)은 식단의 구성과 영양 균형에 대해 분석해주세요.
            6. VNTGian(사내 직원)을 위한 '업무 건강 꿀팁'(healthTip)도 포함해주세요.
            7. 데이터는 반드시 지정된 JSON 형식으로 반환해주세요.` }
          ]
        },
        config: {
          thinkingConfig: { thinkingLevel: ThinkingLevel.LOW },
          responseMimeType: "application/json",
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              mealName: { type: Type.STRING },
              calories: { type: Type.NUMBER },
              carbs: { type: Type.NUMBER },
              protein: { type: Type.NUMBER },
              fat: { type: Type.NUMBER },
              sodium: { type: Type.NUMBER },
              sugar: { type: Type.NUMBER },
              advice: { type: Type.STRING },
              dietScore: { type: Type.STRING },
              pros: { type: Type.ARRAY, items: { type: Type.STRING } },
              cons: { type: Type.ARRAY, items: { type: Type.STRING } },
              medicalPros: { type: Type.STRING },
              medicalCons: { type: Type.STRING },
              healthTip: { type: Type.STRING }
            },
            required: ["mealName", "calories", "carbs", "protein", "fat", "sodium", "sugar", "advice", "dietScore", "pros", "cons", "medicalPros", "medicalCons", "healthTip"]
          }
        }
      });

      const result = JSON.parse(response.text || "{}");
      setNutrition(result);
    } catch (err) {
      console.error("Text analysis failed:", err);
      setError("앗! 음식 정보를 가져오는데 실패했어요. 😭 다시 검색해보실래요?");
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handleSearchItemClick = async (item: typeof SEARCH_ITEMS[0]) => {
    setSearchTerm(item.name);
    handleTextSearch(undefined, item.name);
  };

  const analyzeImage = async (base64Image: string) => {
    setIsAnalyzing(true);
    setError(null);
    setNutrition(null);
    setIsTextSearch(false);

    try {
      // Image compression (simple canvas resize) to speed up upload/processing
      const compressedBase64 = await new Promise<string>((resolve) => {
        const img = new Image();
        img.src = base64Image;
        img.onload = () => {
          const canvas = document.createElement('canvas');
          const MAX_WIDTH = 800; // Resize to max 800px width
          const scale = Math.min(1, MAX_WIDTH / img.width);
          canvas.width = img.width * scale;
          canvas.height = img.height * scale;
          const ctx = canvas.getContext('2d');
          ctx?.drawImage(img, 0, 0, canvas.width, canvas.height);
          resolve(canvas.toDataURL('image/jpeg', 0.7)); // 0.7 quality jpeg
        };
      });

      const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY! });
      
      const imagePart = {
        inlineData: {
          mimeType: "image/jpeg",
          data: compressedBase64.split(',')[1],
        },
      };

      const response = await ai.models.generateContent({
        model: "gemini-3-flash-preview",
        contents: {
          parts: [
            { text: `이 식사 사진을 분석하여 아주 재미있고 친근한 말투로 영양 정보를 제공해주세요! 😊
            
            1. 모든 텍스트는 한국어로, 이모지를 섞어서 재미있게 작성해주세요.
            2. '다이어트에 도움이 될까?'(dietScore) 섹션에는 이 음식이 다이어트에 얼마나 좋은지 재미있는 한 문장으로 표현해주세요.
            3. '장점'과 '단점'을 각각 리스트 형태로 추출해주세요.
            4. '의학적 분석'(medicalPros, medicalCons) 섹션에는 이 음식이 의학적으로 우리 몸의 어디에 좋은지, 그리고 과하게 먹었을 때 어디에 안 좋을 수 있는지 설명해주세요.
            5. '영양사의 조언'(advice)은 식단의 구성과 영양 균형에 대해 분석해주세요.
            6. VNTGian(사내 직원)을 위한 '업무 건강 꿀팁'(healthTip)도 포함해주세요.
            7. 데이터는 반드시 지정된 JSON 형식으로 반환해주세요.` },
            imagePart
          ]
        },
        config: {
          thinkingConfig: { thinkingLevel: ThinkingLevel.LOW }, // Minimize latency
          responseMimeType: "application/json",
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              mealName: { type: Type.STRING },
              calories: { type: Type.NUMBER },
              carbs: { type: Type.NUMBER },
              protein: { type: Type.NUMBER },
              fat: { type: Type.NUMBER },
              sodium: { type: Type.NUMBER },
              sugar: { type: Type.NUMBER },
              advice: { type: Type.STRING },
              dietScore: { type: Type.STRING },
              pros: { type: Type.ARRAY, items: { type: Type.STRING } },
              cons: { type: Type.ARRAY, items: { type: Type.STRING } },
              medicalPros: { type: Type.STRING },
              medicalCons: { type: Type.STRING },
              healthTip: { type: Type.STRING }
            },
            required: ["mealName", "calories", "carbs", "protein", "fat", "sodium", "sugar", "advice", "dietScore", "pros", "cons", "medicalPros", "medicalCons", "healthTip"]
          }
        }
      });

      const result = JSON.parse(response.text || "{}");
      setNutrition(result);
    } catch (err) {
      console.error("Analysis failed:", err);
      setError("앗! 식단 분석에 실패했어요. 😭 다시 한번 찍어주실래요?");
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handleSaveImage = async () => {
    if (!captureRef.current) return;
    
    try {
      const canvas = await html2canvas(captureRef.current, {
        useCORS: true,
        backgroundColor: '#F8FAF9',
        scale: 2,
        onclone: (clonedDoc) => {
          const elements = clonedDoc.querySelectorAll('*');
          elements.forEach((el) => {
            if (el instanceof HTMLElement) {
              const style = window.getComputedStyle(el);
              const fixColor = (color: string) => {
                if (color.includes('oklch') || color.includes('oklab')) {
                  if (el.classList.contains('bg-primary')) return '#FF8A00';
                  if (el.classList.contains('text-primary')) return '#FF8A00';
                  return '#888888';
                }
                return color;
              };
              el.style.backgroundColor = fixColor(style.backgroundColor);
              el.style.color = fixColor(style.color);
              el.style.borderColor = fixColor(style.borderColor);
            }
          });
          const captureEl = clonedDoc.getElementById('capture-area');
          if (captureEl) captureEl.style.backgroundColor = '#F8FAF9';
        }
      });
      
      const link = document.createElement('a');
      link.download = `비타민_식단분석_${nutrition?.mealName || '식사'}.jpg`;
      link.href = canvas.toDataURL('image/jpeg', 0.9);
      link.click();
    } catch (err) {
      console.error("Save failed:", err);
      alert("이미지 저장에 실패했습니다.");
    }
  };

  const reset = () => {
    setImage(null);
    setNutrition(null);
    setError(null);
    setShowSearch(false);
    setIsTextSearch(false);
    setSearchTerm('');
  };

  return (
    <div className="min-h-screen flex justify-center items-start sm:items-center p-0 sm:p-4">
      <div className="w-full max-w-[430px] bg-white min-h-screen sm:min-h-[800px] sm:rounded-[3rem] shadow-2xl overflow-hidden relative flex flex-col border-x border-slate-100">
        
        {/* Header */}
        <header className="px-6 pt-8 pb-4 flex justify-between items-center bg-white/80 backdrop-blur-md sticky top-0 z-20">
          <div className="flex items-center gap-2">
            {(nutrition || showSearch) ? (
              <button 
                onClick={reset}
                className="p-2 -ml-2 hover:bg-slate-100 rounded-full transition-colors text-slate-600"
              >
                <ChevronLeft size={24} />
              </button>
            ) : (
              <div className="w-8 h-8 bg-primary rounded-lg flex items-center justify-center text-white font-bold italic">V</div>
            )}
            <h1 className="text-xl font-display font-bold tracking-tight text-slate-800">V-tamin 🍊</h1>
          </div>
          {(nutrition || showSearch) && (
            <button 
              onClick={reset}
              className="p-2 hover:bg-slate-100 rounded-full transition-colors text-slate-400"
            >
              <RefreshCw size={20} />
            </button>
          )}
        </header>

        <main className="flex-1 overflow-y-auto px-6 pb-24">
          <AnimatePresence mode="wait">
            {!image && !isAnalyzing && !showSearch && !nutrition && !error && (
              <motion.div 
                key="landing"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                className="flex flex-col items-center justify-center h-[60vh] text-center"
              >
                <div className="w-24 h-24 bg-orange-50 rounded-full flex items-center justify-center mb-6">
                  <Utensils className="text-primary w-12 h-12" />
                </div>
                <h2 className="text-2xl font-display font-bold text-slate-800 mb-2">오늘 뭐 드셨나요?<br/>궁금해서 현기증 나요! 😋</h2>
                <p className="text-slate-500 mb-8">사진 한 장만 툭~ 던져주세요.<br/>영양 성분부터 꿀팁까지 다 알려드릴게요!</p>
                
                <div className="flex flex-col gap-3 w-full">
                  <button 
                    onClick={() => fileInputRef.current?.click()}
                    className="w-full bg-primary text-white py-4 rounded-2xl font-bold flex items-center justify-center gap-2 shadow-lg shadow-orange-200 active:scale-95 transition-transform"
                  >
                    <Camera size={20} />
                    사진 촬영 및 업로드
                  </button>
                  <button 
                    onClick={() => setShowSearch(true)}
                    className="w-full bg-white border-2 border-slate-100 text-slate-600 py-4 rounded-2xl font-bold flex items-center justify-center gap-2 active:scale-95 transition-transform"
                  >
                    <Search size={20} />
                    음식 검색하기
                  </button>
                  <input 
                    type="file" 
                    ref={fileInputRef} 
                    onChange={handleImageUpload} 
                    accept="image/*" 
                    capture="environment"
                    className="hidden" 
                  />
                </div>
              </motion.div>
            )}

            {showSearch && !isAnalyzing && (
              <motion.div 
                key="search"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="py-4 space-y-6"
              >
                <div className="space-y-4">
                  <form onSubmit={handleTextSearch} className="relative">
                    <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                    <input 
                      type="text"
                      placeholder="어떤 음식을 찾으시나요?"
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="w-full bg-slate-100 border-none rounded-2xl py-4 pl-12 pr-16 text-slate-800 placeholder:text-slate-400 focus:ring-2 focus:ring-primary/20 transition-all"
                    />
                    <button 
                      type="submit"
                      className="absolute right-2 top-1/2 -translate-y-1/2 bg-primary text-white px-4 py-2 rounded-xl text-xs font-bold"
                    >
                      검색
                    </button>
                  </form>
                  <div className="text-center">
                    <h2 className="text-xl font-bold text-slate-800">AI에게 물어보세요! 🍱</h2>
                    <p className="text-slate-500 text-sm mt-1">궁금한 음식을 검색하면 영양 성분을 분석해드려요.</p>
                  </div>
                </div>

                <div className="space-y-3">
                  <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest px-2">인기 검색어</h3>
                  <div className="flex flex-wrap gap-2">
                    {SEARCH_ITEMS.map((item) => (
                      <button
                        key={item.id}
                        onClick={() => handleSearchItemClick(item)}
                        className="px-4 py-2 bg-white border border-slate-100 rounded-2xl text-sm font-medium text-slate-600 hover:border-primary hover:text-primary transition-all shadow-sm"
                      >
                        {item.name}
                      </button>
                    ))}
                  </div>
                </div>
              </motion.div>
            )}

            {isAnalyzing && (
              <motion.div 
                key="loading"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="flex flex-col items-center justify-center h-[60vh] text-center"
              >
                <div className="relative w-20 h-20 mb-6">
                  <motion.div 
                    animate={{ rotate: 360 }}
                    transition={{ repeat: Infinity, duration: 2, ease: "linear" }}
                    className="w-full h-full border-4 border-slate-100 border-t-primary rounded-full"
                  />
                  <div className="absolute inset-0 flex items-center justify-center">
                    <div className="w-10 h-10 bg-orange-100 rounded-full animate-pulse" />
                  </div>
                </div>
                <h3 className="text-lg font-bold text-slate-800 mb-1">
                  {isTextSearch ? "음식 정보 검색 중... 🔍" : "음식 사진 스캔 중... 🔍"}
                </h3>
                <p className="text-slate-400 text-sm">
                  {isTextSearch ? "AI가 맛있는 정보를 찾고 있어요!" : "영양사 친구가 열심히 분석하고 있어요!"}
                  <br/>잠시만 기다려주세요~
                </p>
              </motion.div>
            )}

            {nutrition && (image || isTextSearch) && !isAnalyzing && !showSearch && (
              <motion.div 
                key="result"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="space-y-6 py-4"
                ref={captureRef}
                id="capture-area"
              >
                {/* Image Card or Text Header */}
                {image ? (
                  <div className="rounded-3xl overflow-hidden shadow-xl border border-slate-100 aspect-[4/3] relative group">
                    <img src={image} alt="Meal" className="w-full h-full object-cover" />
                    <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/60 to-transparent p-6">
                      <h3 className="text-white text-xl font-bold">{nutrition.mealName}</h3>
                      <div className="flex items-baseline gap-1">
                        <span className="text-white text-4xl font-display font-bold">{nutrition.calories}</span>
                        <span className="text-white/80 text-sm font-medium">kcal</span>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="bg-white rounded-3xl p-8 shadow-sm border border-slate-100 text-center space-y-2">
                    <div className="w-16 h-16 bg-orange-50 rounded-full flex items-center justify-center mx-auto mb-4">
                      <Utensils className="text-primary w-8 h-8" />
                    </div>
                    <h3 className="text-2xl font-bold text-slate-800">{nutrition.mealName}</h3>
                    <div className="flex items-baseline justify-center gap-1">
                      <span className="text-primary text-5xl font-display font-bold">{nutrition.calories}</span>
                      <span className="text-slate-400 text-sm font-medium">kcal</span>
                    </div>
                  </div>
                )}

                {/* Medical Insight Section */}
                <div className="bg-slate-900 rounded-3xl p-6 shadow-xl relative overflow-hidden">
                  <div className="absolute top-0 right-0 p-4 opacity-10">
                    <Heart size={80} className="text-white animate-pulse" />
                  </div>
                  <div className="relative z-10 space-y-4">
                    <div className="text-white/60 text-xs font-bold uppercase tracking-widest">의학적으로 분석해봤어요! 🩺</div>
                    
                    <div className="flex gap-3 items-start">
                      <div className="w-10 h-10 bg-emerald-500/20 rounded-xl flex items-center justify-center text-emerald-400 shrink-0">
                        <Heart size={20} />
                      </div>
                      <div>
                        <div className="text-white/40 text-[10px] font-bold uppercase">이런 점이 좋아요! 👍</div>
                        <div className="text-white text-sm leading-relaxed">{nutrition.medicalPros}</div>
                      </div>
                    </div>

                    <div className="flex gap-3 items-start">
                      <div className="w-10 h-10 bg-red-500/20 rounded-xl flex items-center justify-center text-red-400 shrink-0">
                        <AlertCircle size={20} />
                      </div>
                      <div>
                        <div className="text-white/40 text-[10px] font-bold uppercase">이런 점은 주의해요! ⚠️</div>
                        <div className="text-white text-sm leading-relaxed">{nutrition.medicalCons}</div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Main Nutrients */}
                <div className="bg-white rounded-3xl p-6 shadow-sm border border-slate-100 space-y-5">
                  <h4 className="text-sm font-bold text-slate-400 uppercase tracking-wider">주요 영양 성분</h4>
                  
                  <NutrientBar label="탄수화물" value={nutrition.carbs} unit="g" color="#FF8A00" max={100} />
                  <NutrientBar label="단백질" value={nutrition.protein} unit="g" color="#10B981" max={50} />
                  <NutrientBar label="지방" value={nutrition.fat} unit="g" color="#3B82F6" max={40} />
                </div>

                {/* Advice Section (Expert's Word) */}
                <div className="bg-orange-50 rounded-3xl p-6 border border-orange-100 relative">
                  <div className="absolute -top-3 left-6 bg-primary text-white text-[10px] font-bold px-2 py-1 rounded-md uppercase tracking-tighter">
                    전문가의 한마디 💌
                  </div>
                  <div className="markdown-body text-slate-700 text-sm italic leading-relaxed">
                    <ReactMarkdown>{nutrition.advice.replace(/\\n/g, '\n')}</ReactMarkdown>
                  </div>
                </div>

                {/* Grid Nutrients */}
                <div className="grid grid-cols-2 gap-4">
                  <div className="bg-white rounded-3xl p-5 shadow-sm border border-slate-100">
                    <span className="text-xs font-bold text-slate-400 block mb-2">나트륨</span>
                    <div className="flex items-baseline gap-1">
                      <span className="text-2xl font-display font-bold text-slate-800">{nutrition.sodium}</span>
                      <span className="text-xs text-slate-400">mg</span>
                    </div>
                  </div>
                  <div className="bg-white rounded-3xl p-5 shadow-sm border border-slate-100">
                    <span className="text-xs font-bold text-slate-400 block mb-2">당류</span>
                    <div className="flex items-baseline gap-1">
                      <span className="text-2xl font-display font-bold text-slate-800">{nutrition.sugar}</span>
                      <span className="text-xs text-slate-400">g</span>
                    </div>
                  </div>
                </div>

                {/* Diet Score Section */}
                <div className="bg-blue-50 rounded-3xl p-6 border border-blue-100 relative">
                  <div className="absolute -top-3 left-6 bg-blue-500 text-white text-[10px] font-bold px-2 py-1 rounded-md uppercase tracking-tighter">
                    다이어트에 도움이 될까? 🤔
                  </div>
                  <p className="text-slate-700 text-base font-bold text-center">
                    {nutrition.dietScore}
                  </p>
                </div>

                {/* Pros and Cons Section */}
                <div className="bg-purple-50 rounded-3xl p-6 border border-purple-100 relative">
                  <div className="absolute -top-3 left-6 bg-purple-500 text-white text-[10px] font-bold px-2 py-1 rounded-md uppercase tracking-tighter">
                    음식의 장점 VS 단점 ⚖️
                  </div>
                  <div className="space-y-4">
                    <div>
                      <div className="text-[10px] font-bold text-purple-400 uppercase mb-2">Good Points 👍</div>
                      <div className="flex flex-wrap gap-2">
                        {nutrition.pros.map((pro, i) => (
                          <span key={i} className="px-3 py-1.5 bg-white border border-purple-100 text-purple-700 text-xs font-bold rounded-xl shadow-sm">
                            {pro}
                          </span>
                        ))}
                      </div>
                    </div>
                    <div>
                      <div className="text-[10px] font-bold text-slate-400 uppercase mb-2">Watch Out ⚠️</div>
                      <div className="flex flex-wrap gap-2">
                        {nutrition.cons.map((con, i) => (
                          <span key={i} className="px-3 py-1.5 bg-slate-100 border border-slate-200 text-slate-600 text-xs font-bold rounded-xl shadow-sm">
                            {con}
                          </span>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Health Tip Section */}
                <div className="bg-emerald-50 rounded-3xl p-6 border border-emerald-100 relative">
                  <div className="absolute -top-3 left-6 bg-emerald-500 text-white text-[10px] font-bold px-2 py-1 rounded-md uppercase tracking-tighter">
                    VNTGian을 위한 힐링 꿀팁 ✨
                  </div>
                  <div className="flex gap-3 items-start">
                    <div className="p-2 bg-emerald-100 rounded-xl text-emerald-600 shrink-0">
                      <Info size={18} />
                    </div>
                    <div className="text-slate-700 text-sm leading-relaxed">
                      {nutrition.healthTip}
                    </div>
                  </div>
                </div>

                {/* Save Button (Hidden during capture) */}
                <div className="pt-4 pb-8 data-[html2canvas-ignore]:hidden" data-html2canvas-ignore>
                  <button 
                    onClick={handleSaveImage}
                    className="w-full bg-slate-900 text-white py-4 rounded-2xl font-bold flex items-center justify-center gap-2 shadow-lg active:scale-95 transition-transform"
                  >
                    <Download size={20} />
                    결과 이미지로 저장하기
                  </button>
                </div>
              </motion.div>
            )}

            {error && (
              <motion.div 
                key="error"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="flex flex-col items-center justify-center py-12 text-center"
              >
                <div className="w-16 h-16 bg-red-50 rounded-full flex items-center justify-center mb-4 text-red-500">
                  <Info size={32} />
                </div>
                <p className="text-slate-800 font-bold mb-4">{error}</p>
                <button 
                  onClick={reset}
                  className="px-6 py-2 bg-slate-100 rounded-full text-slate-600 font-medium"
                >
                  다시 시도
                </button>
              </motion.div>
            )}
          </AnimatePresence>
        </main>

        {/* Floating Footer Label */}
        <footer className="absolute bottom-6 left-0 right-0 flex justify-center pointer-events-none">
          <div className="bg-white/50 backdrop-blur-sm px-4 py-1 rounded-full border border-white/20">
            <span className="text-[10px] font-medium text-slate-400 tracking-widest uppercase">Gemini AI 기술로 분석됨</span>
          </div>
        </footer>
      </div>
    </div>
  );
}

function NutrientBar({ label, value, unit, color, max }: { label: string, value: number, unit: string, color: string, max: number }) {
  const percentage = Math.min((value / max) * 100, 100);
  
  return (
    <div className="space-y-2">
      <div className="flex justify-between items-end">
        <span className="text-sm font-bold text-slate-700">{label}</span>
        <div className="flex items-baseline gap-0.5">
          <span className="text-lg font-display font-bold text-slate-800">{value}</span>
          <span className="text-[10px] text-slate-400 font-bold uppercase">{unit}</span>
        </div>
      </div>
      <div className="h-2 w-full bg-slate-100 rounded-full overflow-hidden">
        <motion.div 
          initial={{ width: 0 }}
          animate={{ width: `${percentage}%` }}
          transition={{ duration: 1, ease: "easeOut" }}
          className="h-full rounded-full"
          style={{ backgroundColor: color }}
        />
      </div>
    </div>
  );
}

import React, { useState, useEffect } from "react";
import confetti from "canvas-confetti";
import { 
  QrCode, 
  Settings, 
  Search, 
  Copy,
  CheckCircle2, 
  AlertCircle,
  Loader2,
  Gift,
  Coffee,
  ExternalLink
} from "lucide-react";
import { Button } from "./components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "./components/ui/card";
import { Input } from "./components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "./components/ui/tabs";
import logoImg from "../imports/IMG_5600.JPG_(1).jpeg";

interface Member {
  id: string;
  name: string;
  remaining: number;
}

export default function App() {
  const [currentId, setCurrentId] = useState<string | null>(null);
  const [webAppUrl, setWebAppUrl] = useState<string>(() => {
    return localStorage.getItem("gws_webapp_url") || "https://script.google.com/macros/s/AKfycbxjkiPIO9xVr4jRV-GvoS-aPvMpXPzQuVEhJVho8RE5a2_3eG25rxupmw8UUzXy17Y/exec";
  });
  
  // Redemption State
  const [loading, setLoading] = useState(false);
  const [memberData, setMemberData] = useState<Member | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [redeeming, setRedeeming] = useState(false);
  const [redeemSuccess, setRedeemSuccess] = useState(false);

  // Dashboard States
  const [queryId, setQueryId] = useState("");
  const [genId, setGenId] = useState("");
  const [qrCodeUrl, setQrCodeUrl] = useState("");
  const [settingsUrl, setSettingsUrl] = useState(webAppUrl);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const id = params.get("id");
    if (id) {
      setCurrentId(id);
      fetchMemberInfo(id, id); // Use ID from URL for initial load
    }
  }, [webAppUrl]); // Also re-fetch if URL is set later

  const fetchMemberInfo = async (id: string, urlId?: string) => {
    if (!webAppUrl) {
      setError("請先至設定頁面配置 Google Apps Script API URL");
      return;
    }
    setLoading(true);
    setError(null);
    setRedeemSuccess(false);
    try {
      const res = await fetch(`${webAppUrl}?id=${encodeURIComponent(id)}`);
      const data = await res.json();
      if (data.success) {
        setMemberData({ id: data.id, name: data.name, remaining: data.remaining });
      } else {
        setError(data.message || "查無會員資料");
        setMemberData(null);
      }
    } catch (err) {
      setError("網路連線失敗，請檢查 API URL 是否正確或跨來源(CORS)設定。");
      setMemberData(null);
    } finally {
      setLoading(false);
    }
  };

  const handleRedeem = async () => {
    if (!memberData || !webAppUrl) return;
    setRedeeming(true);
    setError(null);
    try {
      const res = await fetch(webAppUrl, {
        method: "POST",
        headers: { "Content-Type": "text/plain" },
        body: JSON.stringify({ id: memberData.id })
      });
      const data = await res.json();
      if (data.success) {
        setMemberData(prev => prev ? { ...prev, remaining: data.remaining } : null);
        setRedeemSuccess(true);
        confetti({ particleCount: 150, spread: 80, origin: { y: 0.6 } });
      } else {
        setError(data.message || "兌換失敗");
      }
    } catch (err) {
      setError("兌換請求失敗，請稍後重試。");
    } finally {
      setRedeeming(false);
    }
  };

  const saveSettings = () => {
    localStorage.setItem("gws_webapp_url", settingsUrl);
    setWebAppUrl(settingsUrl);
    alert("設定已儲存！");
  };

  const handleGenerateQr = () => {
    if (!genId.trim()) return;
    const currentBase = window.location.origin + window.location.pathname;
    const redeemUrl = `${currentBase}?id=${encodeURIComponent(genId.trim())}`;
    const qrApi = `https://api.qrserver.com/v1/create-qr-code/?size=250x250&data=${encodeURIComponent(redeemUrl)}`;
    setQrCodeUrl(qrApi);
  };

  // --- UI: Redemption Mode ---
  if (currentId) {
    return (
      <div className="w-full min-h-screen bg-linear-to-b from-amber-50 to-orange-100 flex flex-col items-center justify-center p-4">
        <div className="mb-8">
            <img src={logoImg} alt="Logo" className="h-16 rounded-lg shadow-sm" />
        </div>
        
        <Card className="w-full max-w-md shadow-xl border-t-4 border-t-primary overflow-hidden">
          <CardHeader className="text-center bg-white pb-2">
            <CardTitle className="text-2xl font-bold tracking-tight">電子兌換券</CardTitle>
            <CardDescription>出示此畫面給店員進行兌換</CardDescription>
          </CardHeader>
          <CardContent className="pt-6 bg-zinc-50/50">
            {loading ? (
              <div className="flex flex-col items-center justify-center py-12 text-zinc-500">
                <Loader2 className="w-8 h-8 animate-spin mb-4" />
                <p>載入會員資料中...</p>
              </div>
            ) : error ? (
              <div className="flex flex-col items-center justify-center py-8 text-destructive text-center">
                <AlertCircle className="w-12 h-12 mb-4 opacity-80" />
                <p className="font-medium mb-2">發生錯誤</p>
                <p className="text-sm opacity-90">{error}</p>
                <Button variant="outline" className="mt-6" onClick={() => fetchMemberInfo(currentId)}>
                  重新載入
                </Button>
              </div>
            ) : memberData ? (
              <div className="space-y-6">
                <div className="bg-white p-4 rounded-xl shadow-sm border flex justify-between items-center">
                  <div>
                    <p className="text-sm text-zinc-500 mb-1">會員姓名</p>
                    <p className="font-semibold text-lg">{memberData.name}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm text-zinc-500 mb-1">會員編號</p>
                    <p className="font-mono text-sm bg-zinc-100 px-2 py-1 rounded">{memberData.id}</p>
                  </div>
                </div>

                <div className="text-center py-4 relative">
                    <div className="absolute inset-0 flex items-center justify-center opacity-5">
                        <Gift className="w-32 h-32" />
                    </div>
                  <p className="text-sm text-zinc-500 mb-2 relative z-10">剩餘可兌換杯數</p>
                  <p className="text-6xl font-bold text-primary relative z-10">
                    {memberData.remaining}
                  </p>
                </div>

                {redeemSuccess && (
                  <div className="bg-green-50 text-green-700 p-4 rounded-lg flex items-center gap-3 animate-in fade-in slide-in-from-bottom-2">
                    <CheckCircle2 className="w-5 h-5 flex-shrink-0" />
                    <p className="font-medium text-sm">兌換成功！已扣除 1 杯。</p>
                  </div>
                )}
              </div>
            ) : null}
          </CardContent>
          {memberData && (
              <CardFooter className="bg-zinc-50/50 pb-6 pt-2">
                <Button 
                className="w-full h-14 text-lg font-bold shadow-md transition-all hover:scale-[1.02]"
                size="lg"
                disabled={memberData.remaining <= 0 || redeeming || loading}
                onClick={handleRedeem}
                >
                {redeeming ? (
                    <><Loader2 className="w-5 h-5 mr-2 animate-spin" /> 處理中...</>
                ) : memberData.remaining <= 0 ? (
                    "已無剩餘兌換券"
                ) : (
                    <><Coffee className="w-5 h-5 mr-2" /> 確認兌換 1 杯</>
                )}
                </Button>
              </CardFooter>
          )}
        </Card>
      </div>
    );
  }

  // --- UI: Dashboard Mode ---
  return (
    <div className="w-full min-h-screen bg-zinc-50 p-4 md:p-8">
      <div className="max-w-4xl mx-auto space-y-6">
        <div className="flex items-center gap-4 mb-8">
           <img src={logoImg} alt="Logo" className="h-12 rounded-lg shadow-sm" />
           <div>
             <h1 className="text-2xl font-bold text-zinc-900">兌換券管理系統</h1>
             <p className="text-zinc-500 text-sm">Google Sheets 後台管理介面</p>
           </div>
        </div>

        <Tabs defaultValue="query" className="w-full">
          <TabsList className="grid w-full grid-cols-3 max-w-md mb-6">
            <TabsTrigger value="query">查詢與扣點</TabsTrigger>
            <TabsTrigger value="qrcode">產生 QR Code</TabsTrigger>
            <TabsTrigger value="settings">系統設定</TabsTrigger>
          </TabsList>

          <TabsContent value="query">
            <Card>
              <CardHeader>
                <CardTitle>手動查詢與扣點</CardTitle>
                <CardDescription>輸入會員編號以查詢剩餘杯數並進行兌換操作。</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="flex gap-2">
                  <Input 
                    placeholder="例如：A001" 
                    value={queryId} 
                    onChange={e => setQueryId(e.target.value)} 
                    onKeyDown={e => e.key === 'Enter' && fetchMemberInfo(queryId)}
                  />
                  <Button onClick={() => fetchMemberInfo(queryId)} disabled={loading || !queryId.trim()}>
                    {loading ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Search className="w-4 h-4 mr-2" />}
                    查詢
                  </Button>
                </div>

                {error && !currentId && (
                  <div className="bg-destructive/10 text-destructive p-3 rounded-md text-sm flex items-center gap-2">
                     <AlertCircle className="w-4 h-4" /> {error}
                  </div>
                )}

                {memberData && !error && !currentId && (
                  <div className="border rounded-lg p-6 bg-white shadow-sm space-y-6">
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                       <div>
                         <p className="text-sm text-zinc-500 mb-1">會員姓名</p>
                         <p className="font-medium text-lg">{memberData.name}</p>
                       </div>
                       <div>
                         <p className="text-sm text-zinc-500 mb-1">會員編號</p>
                         <p className="font-mono bg-zinc-100 px-2 py-1 rounded inline-block text-sm">{memberData.id}</p>
                       </div>
                       <div>
                         <p className="text-sm text-zinc-500 mb-1">剩餘杯數</p>
                         <p className="font-bold text-2xl text-primary">{memberData.remaining}</p>
                       </div>
                    </div>
                    
                    {redeemSuccess && (
                        <div className="bg-green-50 text-green-700 p-3 rounded-md text-sm flex items-center gap-2">
                            <CheckCircle2 className="w-4 h-4" /> 兌換成功！已扣除 1 杯。
                        </div>
                    )}

                    <div className="pt-4 border-t flex justify-end">
                       <Button 
                         size="lg"
                         disabled={memberData.remaining <= 0 || redeeming}
                         onClick={handleRedeem}
                       >
                          {redeeming ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Coffee className="w-4 h-4 mr-2" />}
                          扣除 1 杯
                       </Button>
                    </div>
                  </div>
                )}
                
                {/* Mock Data Helper */}
                <div className="pt-8 border-t">
                    <p className="text-sm text-zinc-500 mb-3">測試用會員編號：</p>
                    <div className="flex gap-2 flex-wrap">
                        {['A001', 'B002', 'C003'].map(id => (
                            <Button key={id} variant="outline" size="sm" onClick={() => { setQueryId(id); fetchMemberInfo(id); }}>
                                {id}
                            </Button>
                        ))}
                    </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="qrcode">
            <Card>
              <CardHeader>
                <CardTitle>產生專屬 QR Code</CardTitle>
                <CardDescription>為特定會員產生兌換用的 QR Code，供實體列印或手機出示使用。</CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="flex gap-2">
                  <Input 
                    placeholder="輸入會員編號 (例如：A001)" 
                    value={genId} 
                    onChange={e => setGenId(e.target.value)} 
                    onKeyDown={e => e.key === 'Enter' && handleGenerateQr()}
                  />
                  <Button onClick={handleGenerateQr} disabled={!genId.trim()}>
                    <QrCode className="w-4 h-4 mr-2" />
                    產生
                  </Button>
                </div>

                {qrCodeUrl && (
                  <div className="mt-8 flex flex-col items-center justify-center p-8 border rounded-lg bg-white shadow-sm space-y-6">
                    <div className="p-4 bg-white border-4 border-zinc-900 rounded-xl">
                       <img src={qrCodeUrl} alt="QR Code" className="w-48 h-48 object-contain" />
                    </div>
                    <div className="text-center space-y-2">
                        <p className="font-medium text-lg">會員 {genId} 的專屬兌換碼</p>
                        <div className="flex items-center gap-2 text-sm text-zinc-500">
                           <code className="bg-zinc-100 px-2 py-1 rounded max-w-[250px] truncate">
                               {window.location.origin}{window.location.pathname}?id={encodeURIComponent(genId.trim())}
                           </code>
                        </div>
                    </div>
                    <div className="flex gap-3">
                        <Button variant="outline" onClick={() => {
                            const url = `${window.location.origin}${window.location.pathname}?id=${encodeURIComponent(genId.trim())}`;
                            navigator.clipboard.writeText(url);
                            alert("連結已複製！");
                        }}>
                            <Copy className="w-4 h-4 mr-2" /> 複製連結
                        </Button>
                        <Button variant="default" onClick={() => {
                            const url = `${window.location.origin}${window.location.pathname}?id=${encodeURIComponent(genId.trim())}`;
                            window.open(url, "_blank");
                        }}>
                            <ExternalLink className="w-4 h-4 mr-2" /> 測試開啟
                        </Button>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="settings">
            <Card>
              <CardHeader>
                <CardTitle>系統設定</CardTitle>
                <CardDescription>配置您的 Google Apps Script 部署網址，這將儲存於您的瀏覽器中。</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium">Google Apps Script Web App URL</label>
                  <Input 
                    type="url"
                    placeholder="https://script.google.com/macros/s/.../exec" 
                    value={settingsUrl} 
                    onChange={e => setSettingsUrl(e.target.value)} 
                  />
                  <p className="text-xs text-zinc-500">
                    請確保您已將 Apps Script 部署為 Web App，且存取權限設為「任何人」。
                  </p>
                </div>
              </CardContent>
              <CardFooter>
                <Button onClick={saveSettings}>儲存設定</Button>
              </CardFooter>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}

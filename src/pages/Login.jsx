import React, { useEffect, useMemo, useState } from "react";

import { useNavigate, useLocation } from "react-router-dom";
import api from '../api/axios';

import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";  
import { useToast } from '@/components/ui/use-toast';
import { Toaster } from "@/components/ui/Toaster";
import { motion } from "framer-motion";

import { LogIn, Eye, EyeOff, ShieldCheck } from "lucide-react";

export default function Login() {
  const navigate = useNavigate();
  const location = useLocation();
  const { toast } = useToast();

  const defaultUser = import.meta.env.VITE_LOGIN_DEMO_USER || "";
  const defaultPass = import.meta.env.VITE_LOGIN_DEMO_PASS || "";
  
  const [username, setUsername] = React.useState(defaultUser);
  const [password, setPassword] = React.useState(defaultPass);
  const [showPass, setShowPass] = useState(false);
  const [ isLoading, setIsLoading ] = React.useState(false);

  useEffect(() => {
    const t = localStorage.getItem("token");
    if (t) {
      const params = new URLSearchParams(location.search);
      const from = params.get("from") || "/";
      navigate(from, { replace: true });
    }
  }, [location, navigate]);

  const isDisabled = useMemo(
    () => !username.trim() || !password.trim() || isLoading,
    [username, password, isLoading]
  );

  async function handleSubmit(e) {
    e.preventDefault();
    if (isDisabled) return;
    setIsLoading(true);
    try {

      const { data } = await api.post("/auth/login", {
        username: username.trim(),
        password: password,
      });
      const accessToken = data?.accessToken;
      const refresh = data?.refreshToken;
      if (!accessToken) {
        throw new Error("No access token received");
      }

      localStorage.setItem("token", accessToken);
      if (refresh) localStorage.setItem("refresh", refresh);
      api.defaults.headers.commom.Authorization = `Bearer ${accessToken}`;
      toast({
        title: "Login realizado",
        description: "Você fez login, Seja Bem-Vindo.",
        duration: 3000,
        icon: <SHieldCheck className="h-5 w-5 text-green-500" />,
      });

      const params = new URLSearchParams(location.search);
      const from = params.get("from") || "/kanban";
      navigate(from, { replace: true });
    }
    catch (error) {
      error?.response?.data?.message || error.message || "Erro ao fazer login";
      toast({
        title: "Erro ao fazer login",
        description: errorMessage,
        duration: 5000,
      });
    }
    finally {
      setIsLoading(false);
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 p-6">
      <Toaster />
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-md"
      >
        <div className="bg-white shadow-xl rounded-2xl p-6 sm:p-8 border border-gray-100">
          {/* Cabeçalho */}
          <div className="flex items-center gap-3 mb-6">
            <div className="p-2 rounded-xl bg-blue-100">
              <ShieldCheck className="w-6 h-6 text-blue-600" />
            </div>
            <div>
              <h1 className="text-xl font-semibold text-gray-900">
                Produção Rubim — Login
              </h1>
              <p className="text-xs text-gray-500">
                Acesse para gerenciar os pedidos no Kanban.
              </p>
            </div>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Usuário
              </label>
              <Input
                type="text"
                placeholder="seu.usuario"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                autoComplete="username"
              />
            </div>

            <div>
              <div className="flex items-center justify-between">
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Senha
                </label>
                {/* espaço para “Esqueci a senha” no futuro */}
              </div>
              <div className="relative">
                <Input
                  type={showPass ? "text" : "password"}
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  autoComplete="current-password"
                  onKeyDown={(e) => {
                    if (e.key === "Enter") handleSubmit(e);
                  }}
                />
                <button
                  type="button"
                  className="absolute right-3 top-2.5 text-gray-500 hover:text-gray-700"
                  onClick={() => setShowPass((s) => !s)}
                  aria-label={showPass ? "Ocultar senha" : "Mostrar senha"}
                >
                  {showPass ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                </button>
              </div>
            </div>

            <Button
              className="w-full"
              type="submit"
              disabled={isDisabled}
            >
              {isLoading ? "Entrando…" : (<span className="inline-flex items-center"><LogIn className="w-4 h-4 mr-2" /> Entrar</span>)}
            </Button>

            {/* Rodapé / dicas */}
            <p className="text-[11px] text-gray-500 text-center">
              Dica: em desenvolvimento, defina <code>VITE_LOGIN_DEMO_USER</code> e{" "}
              <code>VITE_LOGIN_DEMO_PASS</code> no seu <code>.env</code> para preencher automaticamente.
            </p>
          </form>
        </div>
      </motion.div>
    </div>
  );
}
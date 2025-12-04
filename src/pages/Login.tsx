import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { CalendarDays, LogIn } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
const Login = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const {
    login,
    user
  } = useAuth();
  const navigate = useNavigate();
  const {
    toast
  } = useToast();

  // Redirect if already logged in
  if (user) {
    if (user.role === 'admin') navigate('/admin', {
      replace: true
    });else if (user.role === 'worker') navigate('/worker', {
      replace: true
    });else if (user.role === 'franchisee') navigate('/', {
      replace: true
    });
  }
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) {
      toast({
        title: "Błąd",
        description: "Wypełnij wszystkie pola",
        variant: "destructive"
      });
      return;
    }
    const success = await login(email, password);
    if (success) {
      toast({
        title: "Zalogowano pomyślnie",
        description: "Witaj w systemie Pracosfera"
      });

      // Navigation will happen via the effect above
    } else {
      toast({
        title: "Błąd logowania",
        description: "Nieprawidłowy e-mail lub hasło. Sprawdź dane i spróbuj ponownie.",
        variant: "destructive"
      });
    }
  };
  return <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="space-y-4">
          <div className="flex items-center justify-center gap-3">
            <CalendarDays className="h-10 w-10 text-primary" />
            <div className="text-center">
              <CardTitle className="text-3xl text-primary">Pracosfera</CardTitle>
              <CardDescription>System zarządzania pracownikami</CardDescription>
            </div>
          </div>
        </CardHeader>
        <form onSubmit={handleSubmit}>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email">E-mail</Label>
              <Input id="email" type="email" placeholder="twoj@email.com" value={email} onChange={e => setEmail(e.target.value)} autoComplete="email" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">Hasło</Label>
              <Input id="password" type="password" placeholder="Wprowadź hasło" value={password} onChange={e => setPassword(e.target.value)} autoComplete="current-password" />
            </div>
          </CardContent>
          <CardFooter className="flex flex-col gap-4">
            <Button type="submit" className="w-full" size="lg">
              <LogIn className="h-4 w-4 mr-2" />
              Zaloguj się
            </Button>
            <div className="text-sm text-center text-muted-foreground">
              Nie masz konta?{' '}
              <Link to="/register" className="text-primary hover:underline">
                Zarejestruj się jako franczyzobiorca
              </Link>
            </div>
          </CardFooter>
        </form>
      </Card>
    </div>;
};
export default Login;
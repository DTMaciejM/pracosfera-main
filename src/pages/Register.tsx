import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { CalendarDays, UserPlus } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/lib/supabase';
import { toast } from 'sonner';

const Register = () => {
  const [formData, setFormData] = useState({
    name: '',
    phone: '',
    storeAddress: '',
    mpkNumber: '',
    email: '',
    password: '',
    confirmPassword: '',
    termsAccepted: false,
  });
  
  const navigate = useNavigate();
  const { toast } = useToast();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validation
    if (!formData.name || !formData.phone || 
        !formData.storeAddress || !formData.mpkNumber || !formData.email || !formData.password) {
      toast({
        title: "Błąd",
        description: "Wypełnij wszystkie wymagane pola",
        variant: "destructive",
      });
      return;
    }

    if (formData.password !== formData.confirmPassword) {
      toast({
        title: "Błąd",
        description: "Hasła nie są identyczne",
        variant: "destructive",
      });
      return;
    }

    if (!formData.termsAccepted) {
      toast({
        title: "Błąd",
        description: "Musisz zaakceptować regulamin",
        variant: "destructive",
      });
      return;
    }

    try {
      // KROK 1: Utwórz użytkownika w Supabase Auth
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email: formData.email,
        password: formData.password,
        options: {
          data: {
            name: formData.name,
            phone: formData.phone,
            role: 'franchisee',
          }
        }
      });

      if (authError) throw authError;
      if (!authData.user) throw new Error('Nie udało się utworzyć użytkownika');

      // KROK 2: Utwórz rekord w tabeli users powiązany z auth.users
      const { data: userData, error: userError } = await supabase
        .from('users')
        .insert({
          id: authData.user.id, // Użyj ID z auth.users
          auth_user_id: authData.user.id,
          email: formData.email,
          name: formData.name,
          phone: formData.phone,
          role: 'franchisee',
          // password_hash nie jest już potrzebne - Supabase Auth zarządza hasłami
        })
        .select()
        .single();

      if (userError) {
        // Jeśli błąd, usuń użytkownika z auth (opcjonalnie)
        console.error('Error creating user record:', userError);
        throw userError;
      }

      // KROK 3: Utwórz rekord w tabeli franchisees
      const { error: franchiseeError } = await supabase
        .from('franchisees')
        .insert({
          id: userData.id,
          store_address: formData.storeAddress,
          mpk_number: formData.mpkNumber,
          status: 'aktywny',
          terms_accepted: true,
          registered_at: new Date().toISOString(),
        });

      if (franchiseeError) throw franchiseeError;

      toast({
        title: "Rejestracja zakończona pomyślnie",
        description: "Twoje konto zostało utworzone. Możesz się teraz zalogować.",
      });
      
      navigate('/login');
    } catch (error: any) {
      console.error('Registration error:', error);
      toast({
        title: "Błąd rejestracji",
        description: error.message || "Wystąpił błąd podczas rejestracji. Spróbuj ponownie.",
        variant: "destructive",
      });
    }
  };

  return (
    <div className="min-h-screen bg-background flex items-center justify-center p-4">
      <Card className="w-full max-w-2xl">
        <CardHeader>
          <div className="flex items-center justify-center gap-3 mb-4">
            <CalendarDays className="h-10 w-10 text-primary" />
            <div className="text-center">
              <CardTitle className="text-3xl">Pracosfera</CardTitle>
              <CardDescription>Rejestracja franczyzobiorcy</CardDescription>
            </div>
          </div>
        </CardHeader>
        <form onSubmit={handleSubmit}>
          <CardContent className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="name">Imię i nazwisko *</Label>
                <Input
                  id="name"
                  type="text"
                  placeholder="Jan Kowalski"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="phone">Telefon *</Label>
                <Input
                  id="phone"
                  type="tel"
                  placeholder="+48 123 456 789"
                  value={formData.phone}
                  onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                />
              </div>
              <div className="space-y-2 md:col-span-2">
                <Label htmlFor="storeAddress">Adres sklepu *</Label>
                <Input
                  id="storeAddress"
                  type="text"
                  placeholder="ul. Główna 15, 00-001 Warszawa"
                  value={formData.storeAddress}
                  onChange={(e) => setFormData({ ...formData, storeAddress: e.target.value })}
                />
              </div>
              <div className="space-y-2 md:col-span-2">
                <Label htmlFor="mpkNumber">Numer MPK *</Label>
                <Input
                  id="mpkNumber"
                  type="text"
                  placeholder="XX-001"
                  value={formData.mpkNumber}
                  onChange={(e) => setFormData({ ...formData, mpkNumber: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="email">E-mail *</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="twoj@email.com"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  autoComplete="email"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="password">Hasło *</Label>
                <Input
                  id="password"
                  type="password"
                  placeholder="Minimum 8 znaków"
                  value={formData.password}
                  onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                  autoComplete="new-password"
                />
              </div>
              <div className="space-y-2 md:col-span-2">
                <Label htmlFor="confirmPassword">Potwierdź hasło *</Label>
                <Input
                  id="confirmPassword"
                  type="password"
                  placeholder="Powtórz hasło"
                  value={formData.confirmPassword}
                  onChange={(e) => setFormData({ ...formData, confirmPassword: e.target.value })}
                  autoComplete="new-password"
                />
              </div>
            </div>

            <div className="flex items-start space-x-2">
              <Checkbox
                id="terms"
                checked={formData.termsAccepted}
                onCheckedChange={(checked) => 
                  setFormData({ ...formData, termsAccepted: checked as boolean })
                }
              />
              <Label
                htmlFor="terms"
                className="text-sm font-normal leading-tight cursor-pointer"
              >
                Akceptuję regulamin serwisu i wyrażam zgodę na przetwarzanie danych osobowych *
              </Label>
            </div>
          </CardContent>
          <CardFooter className="flex flex-col gap-4">
            <Button type="submit" className="w-full" size="lg">
              <UserPlus className="h-4 w-4 mr-2" />
              Zarejestruj się
            </Button>
            <div className="text-sm text-center text-muted-foreground">
              Masz już konto?{' '}
              <Link to="/login" className="text-primary hover:underline">
                Zaloguj się
              </Link>
            </div>
          </CardFooter>
        </form>
      </Card>
    </div>
  );
};

export default Register;

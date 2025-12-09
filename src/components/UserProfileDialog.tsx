import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { useAuth } from "@/contexts/AuthContext";
import { FranchiseeUser } from "@/types/user";
import { User as UserIcon, Lock } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/lib/supabase";
// Password management is now handled by Supabase Auth
import { toast as sonnerToast } from "sonner";

const profileSchema = z.object({
  name: z.string().min(2, "Imię i nazwisko musi mieć co najmniej 2 znaki"),
  phone: z.string().min(9, "Numer telefonu jest wymagany"),
  storeAddress: z.string().optional(),
});

const passwordSchema = z.object({
  currentPassword: z.string().min(1, "Aktualne hasło jest wymagane"),
  newPassword: z.string().min(6, "Nowe hasło musi mieć co najmniej 6 znaków"),
  confirmPassword: z.string().min(1, "Potwierdzenie hasła jest wymagane"),
}).refine((data) => data.newPassword === data.confirmPassword, {
  message: "Hasła nie są identyczne",
  path: ["confirmPassword"],
});

type ProfileFormValues = z.infer<typeof profileSchema>;
type PasswordFormValues = z.infer<typeof passwordSchema>;

interface UserProfileDialogProps {
  triggerButton?: React.ReactNode;
}

export function UserProfileDialog({ triggerButton }: UserProfileDialogProps) {
  const { user, updateUser } = useAuth();
  const { toast } = useToast();
  const [open, setOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const profileForm = useForm<ProfileFormValues>({
    resolver: zodResolver(profileSchema),
    defaultValues: {
      name: user?.name || "",
      phone: user?.phone || "",
      storeAddress: (user?.role === 'franchisee' && 'storeAddress' in user) ? (user as FranchiseeUser).storeAddress : "",
    },
  });

  // Load franchisee data when dialog opens
  useEffect(() => {
    const loadFranchiseeData = async () => {
      if (user && user.role === 'franchisee' && open) {
        try {
          const { data: franchiseeData, error } = await supabase
            .from('franchisees')
            .select('store_address, mpk_number')
            .eq('id', user.id)
            .single();

          if (!error && franchiseeData) {
            profileForm.reset({
              name: user.name || "",
              phone: user.phone || "",
              storeAddress: franchiseeData.store_address || "",
            });
          } else {
            profileForm.reset({
              name: user.name || "",
              phone: user.phone || "",
              storeAddress: "",
            });
          }
        } catch (error) {
          console.error('Error loading franchisee data:', error);
          profileForm.reset({
            name: user.name || "",
            phone: user.phone || "",
            storeAddress: "",
          });
        }
      } else if (user && open) {
        profileForm.reset({
          name: user.name || "",
          phone: user.phone || "",
          storeAddress: "",
        });
      }
    };

    loadFranchiseeData();
  }, [user, open]);

  const passwordForm = useForm<PasswordFormValues>({
    resolver: zodResolver(passwordSchema),
    defaultValues: {
      currentPassword: "",
      newPassword: "",
      confirmPassword: "",
    },
  });

  const onProfileSubmit = async (data: ProfileFormValues) => {
    if (!user) return;

    setIsSubmitting(true);
    try {
      // Update user in Supabase
      const { error: userError } = await supabase
        .from('users')
        .update({
          name: data.name,
          phone: data.phone,
        })
        .eq('id', user.id);

      if (userError) throw userError;

      // If franchisee, also update store_address in franchisees table
      if (user.role === 'franchisee' && data.storeAddress !== undefined) {
        const { error: franchiseeError } = await supabase
          .from('franchisees')
          .update({
            store_address: data.storeAddress,
          })
          .eq('id', user.id);

        if (franchiseeError) throw franchiseeError;
      }

      // Update user in context and localStorage
      const updatedUserData: Partial<typeof user> = {
        name: data.name,
        phone: data.phone,
      };
      
      if (user.role === 'franchisee' && data.storeAddress !== undefined) {
        (updatedUserData as Partial<FranchiseeUser>).storeAddress = data.storeAddress;
      }

      updateUser(updatedUserData);

      sonnerToast.success("Dane zaktualizowane", {
        description: "Twoje dane zostały pomyślnie zaktualizowane.",
      });

      setOpen(false);
    } catch (error: any) {
      console.error('Error updating profile:', error);
      sonnerToast.error("Błąd aktualizacji", {
        description: error.message || "Wystąpił błąd podczas aktualizacji danych.",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const onPasswordSubmit = async (data: PasswordFormValues) => {
    if (!user) return;

    setIsSubmitting(true);
    try {
      // Update password using Supabase Auth
      // Note: Supabase Auth updateUser doesn't require current password verification
      // If you need to verify current password, user must be authenticated
      const { error: updateError } = await supabase.auth.updateUser({
        password: data.newPassword
      });

      if (updateError) {
        passwordForm.setError("currentPassword", {
          message: updateError.message || "Nie udało się zmienić hasła",
        });
        setIsSubmitting(false);
        return;
      }

      sonnerToast.success("Hasło zmienione", {
        description: "Twoje hasło zostało pomyślnie zmienione.",
      });

      passwordForm.reset();
      setOpen(false);
    } catch (error: any) {
      console.error('Error changing password:', error);
      sonnerToast.error("Błąd zmiany hasła", {
        description: error.message || "Wystąpił błąd podczas zmiany hasła.",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {triggerButton || (
          <Button variant="outline" size="sm" className="gap-1">
            <UserIcon className="h-4 w-4" />
            <span className="hidden sm:inline">Profil</span>
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Profil użytkownika</DialogTitle>
          <DialogDescription>
            Zaktualizuj swoje dane lub zmień hasło
          </DialogDescription>
        </DialogHeader>
        
        <Tabs defaultValue="profile" className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="profile">Dane</TabsTrigger>
            <TabsTrigger value="password">Hasło</TabsTrigger>
          </TabsList>
          
          <TabsContent value="profile" className="space-y-4 mt-4">
            <Form {...profileForm}>
              <form onSubmit={profileForm.handleSubmit(onProfileSubmit)} className="space-y-4">
                <FormField
                  control={profileForm.control}
                  name="name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Imię i nazwisko</FormLabel>
                      <FormControl>
                        <Input {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <FormField
                  control={profileForm.control}
                  name="phone"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Numer telefonu</FormLabel>
                      <FormControl>
                        <Input {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                {user?.role === 'franchisee' && (
                  <>
                    <FormField
                      control={profileForm.control}
                      name="storeAddress"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Adres sklepu</FormLabel>
                          <FormControl>
                            <Input {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    
                    <div className="space-y-2">
                      <FormLabel>Numer MPK</FormLabel>
                      <Input 
                        value={'mpkNumber' in user ? (user as FranchiseeUser).mpkNumber : ''} 
                        disabled 
                        className="bg-muted"
                      />
                      <p className="text-sm text-muted-foreground">
                        Numer MPK nie może być edytowany
                      </p>
                    </div>
                  </>
                )}
                
                <div className="flex justify-end gap-2">
                  <Button type="button" variant="outline" onClick={() => setOpen(false)} disabled={isSubmitting}>
                    Anuluj
                  </Button>
                  <Button type="submit" disabled={isSubmitting}>
                    {isSubmitting ? "Zapisywanie..." : "Zapisz zmiany"}
                  </Button>
                </div>
              </form>
            </Form>
          </TabsContent>
          
          <TabsContent value="password" className="space-y-4 mt-4">
            <Form {...passwordForm}>
              <form onSubmit={passwordForm.handleSubmit(onPasswordSubmit)} className="space-y-4">
                <FormField
                  control={passwordForm.control}
                  name="currentPassword"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Aktualne hasło</FormLabel>
                      <FormControl>
                        <Input {...field} type="password" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <FormField
                  control={passwordForm.control}
                  name="newPassword"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Nowe hasło</FormLabel>
                      <FormControl>
                        <Input {...field} type="password" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <FormField
                  control={passwordForm.control}
                  name="confirmPassword"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Potwierdź nowe hasło</FormLabel>
                      <FormControl>
                        <Input {...field} type="password" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <div className="flex justify-end gap-2">
                  <Button type="button" variant="outline" onClick={() => setOpen(false)} disabled={isSubmitting}>
                    Anuluj
                  </Button>
                  <Button type="submit" disabled={isSubmitting}>
                    <Lock className="h-4 w-4 mr-2" />
                    {isSubmitting ? "Zmienianie..." : "Zmień hasło"}
                  </Button>
                </div>
              </form>
            </Form>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  );
}

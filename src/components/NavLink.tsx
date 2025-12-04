import { Link, useLocation } from "react-router-dom";
import { cn } from "@/lib/utils";
import { ReactNode } from "react";

interface NavLinkProps {
  to: string;
  children: ReactNode;
  className?: string;
  activeClassName?: string;
  end?: boolean;
}

export const NavLink = ({ to, children, className, activeClassName, end }: NavLinkProps) => {
  const location = useLocation();
  const isActive = end 
    ? location.pathname === to 
    : location.pathname.startsWith(to);

  return (
    <Link
      to={to}
      className={cn(className, isActive && activeClassName)}
    >
      {children}
    </Link>
  );
};

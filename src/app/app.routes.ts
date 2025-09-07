import { Routes } from '@angular/router';

export const routes: Routes = [
     {
        path: '',
        redirectTo: 'cadastro',
        pathMatch: 'full'
    },  
    {
        path: 'cadastro',
        loadComponent: () => import('./pages/cadastro/cadastro').then(m => m.Cadastro)
    },
    {
        path: 'login',
        loadComponent: () => import('./pages/login/login').then(m => m.Login)
    }
    ,  
    {
        path: 'admin-home',
        loadComponent: () => import('./pages/admin-home/admin-home').then(m => m.AdminHome)
    },
    {
        path: 'user-home',
        loadComponent: () => import('./pages/user-home/user-home').then(m => m.UserHome)
    }
];

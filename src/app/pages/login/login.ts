import { CommonModule } from '@angular/common';
import { Component } from '@angular/core';

import { Auth, signInWithEmailAndPassword, user } from '@angular/fire/auth';


import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { doc, Firestore, getDoc } from '@angular/fire/firestore';


@Component({
  selector: 'app-login',
  imports: [CommonModule, FormsModule],
  templateUrl: './login.html',
  styleUrl: './login.css'
})
export class Login {
 
  constructor(private Router: Router, private Auth: Auth, private firestore: Firestore){}

  email = ''
  senha = ''
  uid: string = ''

  erroEmail: boolean = false
  erroSenha: boolean = false

  erroLog: boolean = false

  dominiosPermitidos: string[] = ['@gmail.com','@gotmail.com','@outlook.com']

  validarEmail(email: string): boolean {
    const emailFormatado = email.trim().toLowerCase()
    return this.dominiosPermitidos.some(dominio => emailFormatado.endsWith(dominio))
  }

  async Entrar(){
    this.erroEmail = !this.validarEmail(this.email)
    this.erroSenha = this.senha.trim().length < 6;

    if(this.erroEmail || this.erroSenha ){
      return
    }

    try {
      const userCredential = await signInWithEmailAndPassword(this.Auth,this.email, this.senha)
      const uid = userCredential.user.uid;

      alert('Logado com sucesso')

      const userRef = doc(this.firestore, 'users', uid); 
      const userSnap = await getDoc(userRef);

    if(userSnap.exists()){
      const funcao = userSnap.data()['funcao'];
      console.log('Função do usuário:', funcao);
      if(funcao === 'Vendedor'){
        this.Router.navigate(['/admin-home']);
      } else if(funcao === 'Comprador'){
        this.Router.navigate(['/user-home']);
      }
    }

    } catch (error: any) {
      this.erroLog = true
      console.error('Erro ao logar-se:', error);
      alert('Erro no Login: ' + error.message);
    }

  }
  Cad(){
    this.Router.navigateByUrl('/cadastro')
  }
}

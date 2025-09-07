import { CommonModule } from '@angular/common';
import { Component } from '@angular/core';

import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';

import { Auth, createUserWithEmailAndPassword } from '@angular/fire/auth';
import { Firestore, doc, setDoc } from '@angular/fire/firestore';

@Component({
  selector: 'app-cadastro',
  standalone: true,
  imports: [FormsModule, CommonModule],
  templateUrl: './cadastro.html',
  styleUrl: './cadastro.css'
})
export class Cadastro {
  
  constructor(private Router: Router,
    private firestore: Firestore,
    private auth: Auth){}

  nome = ''
  email = ''
  senha = ''
  Csenha =''
  funcao = ''
  
  erroEmail: boolean = false
  erroNome: boolean = false
  erroSenha: boolean = false
  erroConfirm: boolean = false
  erroFunct: boolean = false
  erroCad: boolean = false

  dominiosPermitidos: string[] = ['@gmail.com','@hotmail.com','@outlook.com']

  validarEmail(email: string): boolean {
    const emailFormatado = email.trim().toLowerCase()
    return this.dominiosPermitidos.some(dominio => emailFormatado.endsWith(dominio))
  }

  async Cadastrar(){
    this.erroNome = !this.nome.trim()
    this.erroEmail = !this.validarEmail(this.email)
    this.erroSenha = this.senha.trim().length < 6;
    this.erroConfirm = this.senha !== this.Csenha || !this.senha.trim()
    this.erroFunct = !this.funcao.trim()

    if(this.erroEmail || this.erroNome || this.erroSenha || this.erroConfirm || this.erroFunct){
      return
    }

    try{
      const userCredential = await createUserWithEmailAndPassword(this.auth, this.email, this.senha)
      const uid = userCredential.user.uid;

      const userRef = doc(this.firestore, 'users', uid);
      await setDoc(userRef, {
        name: this.nome,
        email: this.email,
        funcao: this.funcao,
        createdAt: new Date()
      });

      alert('Cadastro realizado com sucesso!');
      this.Router.navigate(['/login']);
      this.erroCad = false

    } catch(error){
      console.log('Erro ao cadastrar', error)
      this.erroCad = true
    }

  }

  Login(){
    this.Router.navigateByUrl('/login')
  }

}
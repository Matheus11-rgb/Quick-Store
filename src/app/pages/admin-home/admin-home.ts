import { Component } from '@angular/core';
import { FormsModule } from '@angular/forms';

import { CommonModule } from '@angular/common';

import { onAuthStateChanged } from 'firebase/auth';
import { Auth, signOut } from '@angular/fire/auth';
import { Router } from '@angular/router';

import { getStorage, ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { Firestore, getDocs } from '@angular/fire/firestore';
import { addDoc, collection, deleteDoc, doc, getDoc, query, where, updateDoc } from 'firebase/firestore';
import emailjs from 'emailjs-com';


@Component({
  selector: 'app-admin-home',
  imports: [FormsModule, CommonModule],
  templateUrl: './admin-home.html',
  styleUrl: './admin-home.css'
})
export class AdminHome {
  constructor(private auth: Auth, private router: Router, private firestore: Firestore) { }

  uid: string = ''
  pedidoParaConfirmarId: string | null = null;
  produtoParaApagarId: string | null = null;
  produtoEditando: any = null;

  AddProd: boolean = false
  DeleteProd: boolean = false
  EditProd: boolean = false
  ConfirmProd: boolean = false
  ConfirmDelete: boolean = false
  ConfirmEdit: boolean = false
  MyProds: boolean = false
  contato: boolean = false

  quantidadeProd: number = 0
  nomeProd = ''
  descProd = ''
  precoProd = ''
  telProd = ''
  mensagemContato = ''
  emailContato = ''
  categoriaProd: string = '';
  quantidadePed: number = 0

  selectedImage: File | null = null;

  ItensPed: any[] = []
  Produtos: any[] = []
  Pedidos: any[] = []


  erroDesc: boolean = false
  erroNome: boolean = false
  erroPreco: boolean = false
  erroTel: boolean = false
  erroAdc: boolean = false

  congratulations: boolean = false

  imagens: string[] = [
    'WallAdmin.jpeg',
    'WallAdminII.jpeg',
    'WallAdminIII.jpeg'
  ];
  imagemAtual: number = 0;
  intervaloCarrossel: any;

  proximaImagem() {
    this.imagemAtual = (this.imagemAtual + 1) % this.imagens.length;
  }

  anteriorImagem() {
    this.imagemAtual = (this.imagemAtual - 1 + this.imagens.length) % this.imagens.length;
  }

  selecionarImagem(index: number) {
    this.imagemAtual = index;
  }

  AbrirModalDelete() {
    this.DeleteProd = true
  }

  FecharModalDelete() {
    this.DeleteProd = false
  }

  AbrirModalEdit() {
    this.EditProd = true
  }

  FecharModalEdit() {
    this.EditProd = false
  }

  FecharModalConfirmEdit() {
    this.ConfirmEdit = false
  }

  AbrirModalConfirm(id: string) {
    this.ConfirmProd = true
    this.pedidoParaConfirmarId = id;
  }

  FecharModalConfirm() {
    this.ConfirmProd = false
  }

  FecharModalDeleteConfirm() {
    this.ConfirmDelete = false
  }

  FecharModalProds() {
    this.MyProds = false
  }

  get quantidadePedidos(): number {
    return this.pedidosPendentes.length || 0;
  }

  get quantidadeProdutos(): number {
    return this.Produtos?.length || 0;
  }

  get pedidosPendentes() {
    return this.Pedidos.filter(p => p.status !== 'Concluído');
  }
  get pedidosConcluidos() {
    return this.Pedidos.filter(p => p.status === 'Concluído');
  }

  async ngOnInit() {
    this.intervaloCarrossel = setInterval(() => {
      this.proximaImagem();
    }, 5000);
    this.carregarPedidos();
    this.carregarProdutos();
    onAuthStateChanged(this.auth, async (user) => {
      if (user) {
        this.uid = user.uid;
        const produtosRef = collection(this.firestore, 'Produtos');
        const q = query(produtosRef, where('vendedorUid', '==', user.uid));
        const snapshot = await getDocs(q);
        this.Produtos = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      }
    });
  }

  async carregarProdutos() {
    const produtosRef = collection(this.firestore, 'Produtos');
    const snapshot = await getDocs(produtosRef);
    this.Produtos = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    console.log('Produtos carregados:', this.Produtos);
  }
  FecharModal() {
    this.congratulations = false
  }

  AbrirModal() {
    this.AddProd = true
  }

  FecharJanela() {
    this.AddProd = false
  }

  FecharErro() {
    this.erroAdc = false
    this.router.navigateByUrl('/login')
  }

  logout() {
    signOut(this.auth).then(() => {
      this.router.navigate(['/login']);
    });
  }

  async AdicionarProduto() {
    this.erroDesc = !this.descProd.trim()
    this.erroNome = !this.nomeProd.trim()
    this.erroTel = !this.telProd.includes('wa.me') && !this.telProd.includes('api.whatsapp.com')

    if (this.erroDesc || this.erroNome || this.erroTel || this.erroPreco) {
      return
    }

    if (!this.uid) {
      console.error('Usuário não autenticado')
      this.erroAdc = true
      return
    }
    let imageUrl = ''

    try {
      if (this.selectedImage) {
        const storage = getStorage()
        const storageRef = ref(storage, `produtos/${Date.now()}-${this.selectedImage.name}`)


        const snapshot = await uploadBytes(storageRef, this.selectedImage);
        imageUrl = await getDownloadURL(snapshot.ref)
      }
    }
    catch (error) {
      console.error('Erro ao fazer upload da imagem', error)
      this.erroAdc = true
      return
    }
    const Produto = {
      Nome: this.nomeProd,
      Descricao: this.descProd,
      Preco: this.precoProd,
      Telefone: this.telProd,
      Imagem: imageUrl,
      Data: new Date(),
      vendedorUid: this.uid,
      vendedorNome: this.auth.currentUser?.displayName || 'Vendedor',
      Categoria: this.categoriaProd
    }

    try {
      await addDoc(collection(this.firestore, 'Produtos'), Produto)
      this.congratulations = true
      this.AddProd = false

      this.nomeProd = ''
      this.descProd = ''
      this.precoProd = ''
      this.telProd = ''
      this.selectedImage = null

    } catch (error) {
      console.error('Erro ao adicionar o produto', error)
      this.erroAdc = true
    }
  }

  onImageSelected(event: any) {
    if (event.target.files && event.target.files[0]) {
      this.selectedImage = event.target.files[0];
    }
  }

  async ApagarProd(id: string | null) {
    if (!id) return;
    try {
      const ref = doc(this.firestore, 'Produtos', id);
      await deleteDoc(ref);
      this.Produtos = this.Produtos.filter(p => p.id !== id);
      console.log('Produto deletado com sucesso');
    } catch (error) {
      console.error('Erro ao deletar', error);
    }
    this.ConfirmDelete = false;
  }



  async carregarPedidos() {
    const pedidosRef = collection(this.firestore, 'pedidos');
    const snapshot = await getDocs(pedidosRef);

    this.Pedidos = snapshot.docs.map(doc => {
      const data = doc.data();

      
      const produtosAgrupados: any = {};

      if (Array.isArray(data['produtos'])) {
        data['produtos'].forEach((p: any) => {
          if (!produtosAgrupados[p.nome]) {
            produtosAgrupados[p.nome] = { ...p, quantidade: Number(p.quantidade) || 1 };
          } else {
            produtosAgrupados[p.nome].quantidade += Number(p.quantidade) || 1;
          }
        });
      }

      return {
        id: doc.id,
        nomeUsuario: data['nomeUsuario'],
        endereco: data['endereco'],
        produtos: Object.values(produtosAgrupados), // ✅ aqui já vem agrupado
        dataHora: data['dataHora'] ? new Date(data['dataHora'].seconds * 1000) : null,
        status: data['status'] || 'Pendente'
      };
    });

    console.log('Pedidos agrupados:', this.Pedidos);
  }

  async ConfirmarPed(id: string | null) {
    const user = this.auth.currentUser;
    if (!user) {
      console.error('Usuário não autenticado');
      return;
    }
    if (!id) return;

    const PedidoConfirm = {
      id: this.Pedidos[0].id,
      nome: this.Pedidos[0].nomeUsuario,
      endereco: this.Pedidos[0].endereco,
      produtos: this.Pedidos[0].produtos,
      dataHora: this.Pedidos[0].dataHora,
      status: 'Concluído'
    };

    try {
      const pedidoRef = doc(this.firestore, 'pedidos', id);
      await updateDoc(pedidoRef, { status: 'Concluído' });
      // Atualize a lista após confirmar
      this.carregarPedidos();
    } catch (error) {
      console.error('Erro ao confirmar pedido', error);
      alert('Erro ao confirmar pedido. Tente novamente.');
    }
    this.ConfirmProd = false;
  }

  SelecionarProduto(id: string) {
    this.produtoParaApagarId = id;
    this.DeleteProd = false;
    this.ConfirmDelete = true;
  }

  SelecionarProdutoEdit(id: string) {
    this.produtoParaApagarId = id;
    this.produtoEditando = this.Produtos.find(p => p.id === id);
    this.EditProd = false;
    this.ConfirmEdit = true;
  }

  async EditandoProd(produto: any) {
    if (!produto || !produto.id) return;
    try {
      const produtoRef = doc(this.firestore, 'Produtos', produto.id);
      await updateDoc(produtoRef, {
        Nome: produto.Nome,
        Descricao: produto.Descricao,
        Preco: produto.Preco,
      });
      this.carregarProdutos();
      this.ConfirmEdit = false;
      this.produtoEditando = null;
    } catch (error) {
      console.error('Erro ao editar o produto', error);
      this.erroAdc = true;
    }
  }

  MyProducts() {
    this.MyProds = true;
  }

  AbrirModalContato() {
    this.contato = true;
  }

  FecharModalContato() {
    this.contato = false;
  }

  EnviarMensagem() {
    const email = this.emailContato;
    const mensagem = this.mensagemContato;

    emailjs.send('YOUR_SERVICE_ID', 'YOUR_TEMPLATE_ID', {
      from_email: email,
      message: mensagem
    }, 'YOUR_USER_ID')
      .then(() => {
        alert('Mensagem enviada com sucesso!');
        this.FecharModalContato();
      }, (error) => {
        alert('Erro ao enviar mensagem: ' + error.text);
      });
  }
}
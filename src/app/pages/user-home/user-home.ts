import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Firestore, collection, collectionData, doc, setDoc } from '@angular/fire/firestore';


import { FormsModule } from '@angular/forms';
import { Auth, idToken, updateEmail, updatePassword } from '@angular/fire/auth';
import { addDoc, deleteDoc, getDocs, query, where, getDoc } from 'firebase/firestore';
import { onAuthStateChanged } from 'firebase/auth';
import { getDownloadURL, getStorage, ref } from '@angular/fire/storage';
import { uploadBytes } from 'firebase/storage';
import { Router } from '@angular/router';

@Component({
  selector: 'app-user-home',
  imports: [CommonModule, FormsModule],
  templateUrl: './user-home.html',
  styleUrl: './user-home.css'
})
export class UserHome implements OnInit {

  produtos: any[] = [];
  favoritos: any[] = [];
  favoritosIds: string[] = [];
  produtosFiltrados: any[] = [];
  carrinho: any[] = [];
  enderecos: any[] = [];
  pagamentos: any[] = [];
  cartoes: any[] = [];

  filtroSelecionado: string = '';
  nomeUsuario: string = '';


  //Inputs
  pesquisa = '';
  endereco = '';
  name = ''
  email = ''
  password = ''
  Cpassword = ''
  numeroCartao = ''
  nomeCartao = ''
  validadeCartao = ''
  cvvCartao = ''
 
  termosAceitos = false;


  //Erros de validação para adicionar cartão
  erroNumero: boolean = false;
  erroNome: boolean = false;
  erroValidade: boolean = false;
  erroCVV: boolean = false;
  semResultados: boolean = false;

  //Dados do pagamento
  metodoPagamento: string = '';

  //Campos editaveis
  editEmail: boolean = false;
  editPassword: boolean = false;
  editCpassword: boolean = false;

  //Modais do site
  filtros: boolean = false;
  modalFavoritos: boolean = false;
  modalConta: boolean = false;
  avatarUrl: string = '';
  modalCarrinho: boolean = false;
  modalPagamento: boolean = false;
  modalConfig: boolean = false;
  modalEnderecos: boolean = false;
  editEndereco: boolean = false;
  modalAdicionarPagamento: boolean = false;


  //Arrays para Salvar localmente
  Endereco: any = {
    rua: '',
    numero: '',
    complemento: '',
    bairro: '',
    cidade: '',
    estado: ''
  };

  notificacoes: {
    id: string,
    tipo: string,
    mensagem: string,
    lida: boolean
  }[] = []

  constructor(private auth: Auth, private firestore: Firestore, private router: Router) { }

  imagens: string[] = [
    'wallpaper.jpeg',
    'wallpaperI.jpeg',
    'wallpaperII.jpeg',
    'wallpaperIII.jpeg'
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

   get quantidadePedidosCarrinho(): number {
    return this.carrinho.length || 0;
  }

  get quantidadePedidosFavoritos(): number {
    return this.favoritos.length || 0;
  }

  get carrinhoAgrupado() {
  const agrupados: { [nome: string]: any } = {};
  this.carrinho.forEach(item => {
    const nome = item.nome || item.Nome || '';
    if (!agrupados[nome]) {
      agrupados[nome] = { ...item, quantidade: item.quantidade || 1 };
    } else {
      agrupados[nome].quantidade += item.quantidade || 1;
    }
  });
  return Object.values(agrupados);
}

  ngOnDestroy() {
    if (this.intervaloCarrossel) {
      clearInterval(this.intervaloCarrossel);
    }
  }
  async ngOnInit() {
    this.intervaloCarrossel = setInterval(() => {
      this.proximaImagem();
    }, 5000);
    const ProdutosRef = collection(this.firestore, 'Produtos');
    collectionData(ProdutosRef, { idField: 'id' }).subscribe(async (dados: any[]) => {
      this.produtos = dados
      await this.carregarFavoritos();
    });



    onAuthStateChanged(this.auth, async (user) => {
      if (user) {
        const userRef = doc(this.firestore, 'users', user.uid);
        const userSnap = await getDoc(userRef);
        if (userSnap.exists()) {
          this.nomeUsuario = userSnap.data()['name'];
          this.avatarUrl = userSnap.data()['avatarUrl'] || '';
          await this.carregarEnderecos();
        }
      }
    })

  }


  abrirPagamento() { this.modalPagamento = true; }
  fecharModalPagamento() { this.modalPagamento = false; }
  abrirModalCarrinho() { this.modalCarrinho = true; }
  fecharModalCarrinho() { this.modalCarrinho = false; }
  removerDoCarrinho(item: any) {
    this.carrinho = this.carrinho.filter(prod => prod.id !== item.id);
  }

  async finalizarCompra() {
  if (this.carrinho.length === 0) {
    alert('Seu carrinho está vazio!');
    return;
  }

  const user = this.auth.currentUser;
  if (!user) {
    alert('Você precisa estar logado para finalizar a compra.');
    return;
  }

    if (!this.enderecos || this.enderecos.length === 0) {
    alert('Você precisa cadastrar um endereço antes de finalizar a compra.');
    return;
  }

  const pedidoId = Date.now().toString();

  // Salva todos os produtos do carrinho com nome e quantidade
  const produtosPedido = this.carrinho.map(prod => ({
    nome: prod.nome || prod.Nome || '',
    quantidade: prod.quantidade || 1,
    preco: prod.preco || prod.Preco || 0,
    categoria: prod.categoria || prod.Categoria || ''
  }));

  const pedido = {
    endereco: this.enderecos,
    nomeUsuario: user.email,
    produtos: produtosPedido,
    dataHora: new Date(),
    status: 'Pendente',
    id: pedidoId
  };

  const pedidoRef = doc(this.firestore, 'pedidos', pedidoId);
  await setDoc(pedidoRef, pedido);

  alert('Pedido realizado com sucesso!');
  this.carrinho = [];
  this.fecharModalCarrinho();
}
  async filtrarProdutos(categoria: string) {

    if (!this.produtos || this.produtos.length === 0) {
      this.produtosFiltrados = [];
      return;
    }

    switch (categoria) {
      case 'Alimentos':
        this.produtosFiltrados = this.produtos.filter(produto => produto.Categoria === 'alimentos');
        console.log('Filtrando produtos da categoria Alimentos');
        break;
      case 'Eletronicos':
        this.produtosFiltrados = this.produtos.filter(produto => produto.Categoria === 'eletronicos');
        console.log('Filtrando produtos da categoria Eletrônicos');
        break;
      case 'Roupas':
        this.produtosFiltrados = this.produtos.filter(produto => produto.Categoria === 'roupas');
        console.log('Filtrando produtos da categoria Roupas');
        break;
      case 'Pet-Shop':
        this.produtosFiltrados = this.produtos.filter(produto => produto.Categoria === 'petShop');
        console.log('Filtrando produtos da categoria Pet-Shop');
        break;
      case 'Decoracao':
        this.produtosFiltrados = this.produtos.filter(produto => produto.Categoria === 'decoracao');
        console.log('Filtrando produtos da categoria Decoração');
        break;
      case 'none':
        this.produtosFiltrados = [];
        console.log('Removendo filtro, mostrando todos os produtos');
        break;
    }
    this.semResultados = this.produtosFiltrados.length === 0;
    console.log('Produtos disponíveis:', this.produtos);
  }

  AbrirModalPagamento() {
    this.modalAdicionarPagamento = true;
  }

  FecharModalAdicionarPagamento() {
    this.modalAdicionarPagamento = false;
  }

  fecharModal(){
    this.semResultados = false;
  }

  abrirConta() {
    this.modalConta = true;
  }

  FecharConta() {
    this.modalConta = false;
  }

  AbrirFiltro() {
    this.filtros = true;
  }

  FecharFiltro() {
    this.filtros = false;
  }

  async AbrirConfig() {
    this.modalConfig = true;
    this.carregarPagamentos();
    const user = this.auth.currentUser;
    if (!user) {
      console.error('Usuário não está logado');
      this.router.navigate(['/login']);
      return;
    }

    //Buscar Enderecos
    const enderecoRef = collection(this.firestore, 'users', user.uid, 'enderecos')
    const snapshotEnd = await getDocs(enderecoRef);
    this.enderecos = snapshotEnd.docs.map(doc => ({ id: doc.id, ...doc.data() }));

    //Buscar Metodos de pagamento
    const cartoesRef = collection(this.firestore, 'users', user.uid, 'cartoes');
    const snapshotCartoes = await getDocs(cartoesRef);
    this.pagamentos = snapshotCartoes.docs.map(doc => ({ id: doc.id, ...doc.data() }));
  }

  FecharConfig() {
    this.modalConfig = false;
  }

  async carregarFavoritos() {
    const user = this.auth.currentUser;
    if (!user) return;

    // Busca favoritos na subcoleção do usuário
    const favsCol = collection(this.firestore, 'users', user.uid, 'favoritos');
    const snapshot = await getDocs(favsCol);

    // IDs dos produtos favoritos
    this.favoritosIds = snapshot.docs.map(doc => doc.id);

    // Carrega os produtos favoritos
    this.favoritos = this.produtos.filter(prod => this.favoritosIds.includes(prod.id));
  }

  isFavorite(produto: any) {
    return this.favoritosIds.includes(produto.id);
  }

  async toggleFavorite(produto: any) {

    const user = this.auth.currentUser;
    if (!user) return;

    const favRef = doc(this.firestore, 'users', user.uid, 'favoritos', produto.id);

    if (this.isFavorite(produto)) {
      // Remover favorito
      await deleteDoc(favRef);
      this.favoritosIds = this.favoritosIds.filter(id => id !== produto.id);
    } else {
      // Adicionar favorito
      await setDoc(favRef, {
        produtoId: produto.id,
        data: new Date()
      });
      this.favoritosIds.push(produto.id);
    }

    // Atualizar lista de favoritos
    await this.carregarFavoritos();
  }

  abrirModalFavoritos() {
    this.modalFavoritos = true;
  }

  fecharModalFavoritos() {
    this.modalFavoritos = false;
  }

  async onFileSelected(event: any) {
    const user = this.auth.currentUser;
    if (!user) {
      console.error('Usuário não está logado')
      return
    }
    const file = event.target.files[0];
    if (!file) return

    const storage = getStorage();
    const storageRef = ref(storage, `avatars/${user.uid}.jpg`);
    await uploadBytes(storageRef, file)

    const url = await getDownloadURL(storageRef);

    const userRef = doc(this.firestore, 'users', user.uid);
    await setDoc(userRef, { avatarUrl: url }, { merge: true });

    this.avatarUrl = url;
    console.log('Foto de perfil atualizada com sucesso:', url);
  }

  async salvarConfig() {
    const user = this.auth.currentUser;
    if (!user) {
      alert('Usuário não está logado');
      return;
    }
    try {
      //
      const userRef = doc(this.firestore, 'users', user.uid);
      await setDoc(userRef, { Nome: this.name, Email: this.email }, { merge: true });

      // Atualizar email e senha
      if (this.email !== user.email) {
        await updateEmail(user, this.email);
      }

      if (this.password !== this.Cpassword) {
        alert('As senhas não coincidem.');
        console.error('As senhas não coincidem.');
        return
      }
      if (this.password && this.password.length >= 6) {
        await updatePassword(user, this.password);
      }

      alert('Configurações salvas com sucesso!');
      this.modalConta = false;

    } catch (error) {
      console.error('Erro ao salvar configurações:', error);
      alert('Erro ao salvar configurações: ');
    }
  }

  habilitarEdicao(campo: string) {
    console.error('Campo a ser editado:', campo);
    if (campo === 'email') this.editEmail = true;
    if (campo === 'password' || campo === 'Cpassword') {
      this.editPassword = true,
        this.editCpassword = true;
    }
  }

  logout() {
    this.auth.signOut().then(() => {
      console.log('Usuário deslogado com sucesso');
      this.router.navigate(['/login']);
    }).catch((error) => {
      console.error('Erro ao deslogar:', error);
    });
  }

  adicionarAoCarrinho(produto: any) {
    this.carrinho.push(produto);

  }

  async salvarEndereco() {
    // Verifica se o usuário está logado
    const user = this.auth.currentUser;

    if (!user) {
      console.error('Usuário não está logado');
      return;
    }

    try {
      //Gerar um id para o endereco
      const enderecoId = Date.now().toString();
      const enderecoCompleto = { ...this.Endereco, id: enderecoId };



      // Adicionar endereço à lista local
      this.enderecos.push(enderecoCompleto);

      // Salvar endereço no Firestore
      const enderecoRef = doc(this.firestore, 'users', user.uid, 'enderecos', enderecoId);
      await setDoc(enderecoRef, enderecoCompleto, { merge: true });


      //Limpa os campos do formulario
      this.Endereco = {
        rua: '',
        numero: '',
        bairro: '',
        cidade: '',
        estado: '',
        cep: ''
      };
    } catch (error) {
      console.error('Erro ao salvar endereço:', error);
      alert('Erro ao salvar endereço. Tente novamente.');
    }

    this.fecharModalEndereco();
  }

  async removerEndereco(id: string) {
    const user = this.auth.currentUser;
    if (!user) return;
    this.enderecos = this.enderecos.filter(e => e.id !== id);
    const enderecoRef = doc(this.firestore, 'users', user.uid, 'enderecos', id);
    await deleteDoc(enderecoRef);
  }

  async carregarEnderecos() {
    const user = this.auth.currentUser;
    if (!user) return;

    const enderecosRef = collection(this.firestore, 'users', user.uid, 'enderecos');
    const snapshot = await getDocs(enderecosRef);

    this.enderecos = snapshot.docs.map(doc => doc.data());

    // Se quiser preencher o formulário com o primeiro endereço:
    if (this.enderecos.length > 0) {
      this.Endereco = { ...this.enderecos[0] };
    }
  }

  abrirModalEndereco() {
    this.Endereco = {
      rua: '',
      numero: '',
      complemento: '',
      bairro: '',
      cidade: '',
      estado: '',
      cep: '',
      id: ''
    };
    this.editEndereco = false;
    this.modalEnderecos = true;
  }

  fecharModalEndereco() {
    this.modalEnderecos = false;
    this.editEndereco = false;
  }

  editarEndereco(endereco: any) {
    this.Endereco = { ...endereco };
    this.editEndereco = true;
    this.modalEnderecos = true;
  }

  async RemoverPagamento(id: string) {

    const user = this.auth.currentUser;
    if (!user) return;

    const cartaoRef = doc(this.firestore, 'users', user.uid, 'cartoes', id);
    await deleteDoc(cartaoRef);

    this.pagamentos = this.pagamentos.filter(p => p.id !== id);
  }

  async removerFavorito(produto: any) {
    const user = this.auth.currentUser

    if (!user) {
      console.error('Usuário não está logado');
      return;
      this.router.navigate(['/login']);
    }

    //Removendo do Firebase
    const favRef = doc(this.firestore, 'users', user.uid, 'favoritos', produto.id);
    await deleteDoc(favRef);


    //Removendo do Array local
    this.favoritos = this.favoritos.filter(f => f.id !== produto.id);
    this.favoritosIds = this.favoritosIds.filter(id => id !== produto.id);
  }


  async carregarPagamentos() {
    const user = this.auth.currentUser;
    if (!user) {
      console.error('Usuário não está logado');
      return;
    }
    const cartoesRef = collection(this.firestore, 'users', user.uid, 'cartoes');
    const snapshot = await getDocs(cartoesRef);
    this.pagamentos = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
  }
}

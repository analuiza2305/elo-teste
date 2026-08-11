import java.time.LocalDate;
import java.time.LocalTime;

public class Main {
   
    public static void main(String[] args){ 
        
        Mae m1 = new Mae();
        Advogado a1 = new Advogado();
        Psicologo p1 = new Psicologo();
        Empresa e1 = new Empresa();
        Consultas c1 = new Consultas();
        Calendario ca1 = new Calendario();
        Forum f1 = new Forum ();
        Eventos ev1 = new Eventos();
        Chat ch1 = new Chat();
        Artigo Ar1 = new Artigo ();
        Paciente Pa1 = new Paciente();

    
        // Maes
        m1.idMae = 1;
        m1.nomeMae = "Ana";
        m1.telefoneMae = "11999999999";
        m1.emailMae = "ana@email.com";
        m1.cidadeMae = "São Paulo";
        m1.filhosMae = 2;
        m1.empregoMae = "Autônoma";
        m1.senhaMae = "123456";

        m1.idForum = 10;
        m1.idConsulta = 5;
        m1.idCalendario = 3;
        m1.idChat = 8;
        m1.idEvento = 2;
        m1.idArtigo = 7;

        System.out.println(m1.nomeMae + " - " + m1.cidadeMae + " - " + m1.filhosMae + " filhos");

        //Advogado
        a1.idAdvogado = 1;
        a1.oab = "SP998877";
        a1.nomeAdvogado = "Dra. Roberta Silva";
        a1.emailAdvogado = "roberta@adv.com";
        a1.areaAdvogado = "Direito da Família";
        a1.idForum = 202; 

        a1.horariosDisponiveis = LocalTime.of(14, 30); 
        a1.datasDisponiveis = LocalDate.of(2026, 3, 24); 
      
        System.out.println("ID: " + a1.idAdvogado);
        System.out.println("Nome: " + a1.nomeAdvogado);
        System.out.println("OAB: " + a1.oab);
        System.out.println("Área: " + a1.areaAdvogado);
        System.out.println("E-mail: " + a1.emailAdvogado);
        System.out.println("ID do Fórum: " + a1.idForum);
        
        //exibe o horário e data disponíveis do advogado
        System.out.println("Horário Disponível: " + a1.horariosDisponiveis);
        System.out.println("Data Disponível: " + a1.datasDisponiveis);

        //Psicologos
        p1.idPsicologo = 1; 
        p1.crp = "0612345";
        p1.nomePsicologo = "Joaquina Helena";
        p1.emailPsicologo = "jojo@email.com";
        p1.idForum = 101; 

        p1.horariosDisponiveis = LocalTime.of(15, 30); 
        p1.datasDisponiveis = LocalDate.of(2026, 3, 20); 


        System.out.println("ID Interno: " + p1.idPsicologo);
        System.out.println("Nome: " + p1.nomePsicologo);
        System.out.println("Registro CRP: " + p1.crp);
        System.out.println("E-mail: " + p1.emailPsicologo);
        System.out.println("ID do Fórum: " + p1.idForum);
        
        System.out.println("Horário de Atendimento: " + p1.horariosDisponiveis);
        System.out.println("Data de Atendimento: " + p1.datasDisponiveis);

        //Empresa
        e1.idEmpresa = 1;
        e1.CNPJ = 1234509;
        e1.nomeFantasia = "Elo Materno";
        e1.emailEmpresa = "eloomaterno@gmail.com";
        e1.areaDeAtuacao = "juridica";
        e1.senhaEmpresa = "123456";
        e1.idArtigo = 1;
        e1.idCalendario = 1;
        e1.idEvento = 1;
        e1.idForum = 1;

        System.out.println("Nome da empresa:" + e1.nomeFantasia);

        //Consulta
        c1.idConsultas = 1; 
        c1.horariosDisponiveis = LocalTime.of(13,0);
        c1.datasDisponiveis =  LocalDate.of(2026, 4, 12);
        c1.observacoes = "não possui observações.";
        c1.status = "Agendado";

        c1.idMae = 1;
        c1.idProfissional = 1;
        c1.idAgenda = 1;
        System.out.println(c1.idConsultas + " - " + c1.horariosDisponiveis + " - " + c1.datasDisponiveis + " - " + c1.observacoes + " - " + c1.status + " - " ); 

        ca1.idCalendario = 1;
        ca1.idEventos = 1;
        ca1.idMae = 1;
        ca1.idConsultas = 1;
        System.out.println(ca1.idCalendario + " - " + ca1.idEventos + " - " + ca1.idMae + " - " + ca1.idConsultas + " - ");

        //Forum
        f1.idForum = 1;
        f1.postagem = LocalDate.of(2026, 03, 18);
        f1.titulo = "Benefícios para mães solo";
        f1.conteudo = " A diversos benefício para mães solo, confira a seguir alguns deles: ...";
        f1.idMae = 1;
        f1.idAdvogado = 1;
        f1.idPsicologo = 1;
        f1.idEmpresa = 1;
        System.out.println(f1.idForum + " - " + f1.postagem + " - " + f1.titulo + " - " + f1.conteudo + " - " + f1.idMae + " - " + f1.idAdvogado + " - " + f1.idPsicologo + " - " + f1.idEmpresa + " - ");

        // Eventos
        ev1.idEvento = 1;
        ev1.idEmpresa = 1;
        ev1.titulo = "Show do luan santana";
        ev1.descricao = "Este é um show maravilhoso, no qual vai empoderar todas as mães solos.";
        ev1.dataEvento = LocalDate.of(2026,9,12);
        ev1.local = LocalTime.of(21,0);
        ev1.imagem = "caminho.da.imagem.jpg";
        ev1.idMae = 1;

        System.out.println("Esse é o evento do dia"+ ev1.dataEvento + "Com o maior lindo do mundo:" + ev1.titulo);

        // Pacientes
        Pa1.IdMae = 1;
        Pa1.ultimacosuta = LocalDate.of (2026, 02, 02);
        Pa1.idchat = 1;

        System.out.println("Este é o paciente:"+ Pa1.IdMae);

        // Artigos
        Ar1.IdArtigos = 1;
        Ar1.Titulo = "Mãe no controle";
        Ar1.Descricao = "Como manter o controle emocional";
        Ar1.Resumo = "Sempre manter a calma";
        Ar1.Imagem = "imagem.jpg";
        Ar1.Link = "www.maenocontrole.com.br";
        Ar1.Categoria = "Educação";

        System.out.println(Ar1.IdArtigos + " - " + Ar1.Titulo + " - " + Ar1.Descricao + " - " + Ar1.Resumo + " - " + Ar1.Imagem + " - " + Ar1.Link + " - " + Ar1.Categoria + " - ");

        // Chat
        ch1.idchat = 1; 
        ch1.mensagem = "Olá Mundo";

        ch1.IdPsicologo = 1;
        ch1.IdMae = 1;
        ch1.IdAdvogado = 1;

        System.out.println(ch1.idchat + " - " + ch1.mensagem + " - " + ch1.IdPsicologo + " - " + ch1.IdMae + " - " + ch1.IdAdvogado + " - " ); 
    }

}
// =========================================================
// 1. DIRETIVA GLOBAL: ANIMAÇÃO DE SCROLL (FADE-IN)
// Futuro Angular: Isso vai se transformar em uma Custom Directive (ex: @Directive({selector: '[appFadeIn]'}))
// Função: Observa quando o elemento entra na tela e adiciona a classe 'visible'
// =========================================================

const themeToggle = document.getElementById('theme-toggle');
const themeToggleIcon = themeToggle?.querySelector('i');

function applyTheme(isDark) {
    document.body.setAttribute('data-theme', isDark ? 'dark' : 'light');
    document.documentElement.style.colorScheme = isDark ? 'dark' : 'light';
    localStorage.setItem('theme', isDark ? 'dark' : 'light');

    if (themeToggle) {
        themeToggle.setAttribute('aria-label', isDark ? 'Ativar modo claro' : 'Ativar modo escuro');
        if (themeToggleIcon) {
            themeToggleIcon.className = isDark ? 'fa fa-sun' : 'fa fa-moon';
        }
    }
}

const savedTheme = localStorage.getItem('theme');
const prefersDark = window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;
applyTheme(savedTheme ? savedTheme === 'dark' : prefersDark);

if (themeToggle) {
    themeToggle.addEventListener('click', () => {
        const isDark = document.body.getAttribute('data-theme') !== 'dark';
        applyTheme(isDark);
    });
}

document.addEventListener("DOMContentLoaded", () => {
    const observerOptions = {
        root: null,
        rootMargin: '0px 0px -50px 0px', // Aciona a animação um pouco antes do elemento chegar no final da tela
        threshold: 0.2 // Aumentado levemente para esperar um pedaço maior do elemento aparecer
    };

    const observer = new IntersectionObserver((entries, observer) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                entry.target.classList.add('visible');
                // Mantém o unobserve para animar apenas uma vez
                observer.unobserve(entry.target);
            }
        });
    }, observerOptions);

    const fadeElements = document.querySelectorAll('.fade-in');
    fadeElements.forEach(el => observer.observe(el));
});

// =========================================================
// 2. LÓGICA DE COMPONENTE: SEÇÃO "COMO FUNCIONA" (STICKY SCROLL)
// Futuro Angular: Isso vai para o arquivo TypeScript do componente (ex: how-it-works.component.ts)
// Função: Controla a troca das imagens do celular/computador de acordo com o texto lido
// =========================================================
const steps = document.querySelectorAll('.step-card');
const img1 = document.getElementById('mockup-img-1');
const img2 = document.getElementById('mockup-img-2');

if (steps.length > 0 && img1 && img2) {
    let currentImgSrc = img1.src; // Armazena o estado da imagem atual

    const stepObserverOptions = {
        root: null,
        // A imagem só muda quando o card cruzar a linha dos 40% a 60% da tela (o meio)
        rootMargin: '-40% 0px -40% 0px', 
        threshold: 0
    };

    const stepObserver = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                // 1. Atualiza os estilos do texto (destaca o card focado)
                steps.forEach(step => step.classList.remove('is-active'));
                entry.target.classList.add('is-active');

                // 2. Obtém a nova imagem que precisa ser carregada
                const newImageSrc = entry.target.getAttribute('data-image');

                // 3. Executa o Cross-fade apenas se a imagem for diferente da atual
                if (newImageSrc !== currentImgSrc) {
                    
                    // Descobre qual tag <img> está aparecendo e qual está escondida
                    const activeImg = img1.classList.contains('active') ? img1 : img2;
                    const hiddenImg = img1.classList.contains('active') ? img2 : img1;

                    // Carrega a nova imagem na tag escondida
                    hiddenImg.src = newImageSrc;

                    // Aguarda a imagem fazer o download completo para não piscar
                    hiddenImg.onload = () => {
                        // Inverte as classes para disparar a transição CSS de opacidade
                        activeImg.classList.remove('active');
                        hiddenImg.classList.add('active');
                        
                        // Atualiza a referência da imagem atual
                        currentImgSrc = newImageSrc;
                    };
                }
            }
        });
    }, stepObserverOptions);

    // Inicializa a observação para cada card de passo
    steps.forEach(step => stepObserver.observe(step));
}


// =========================================================
// 3. SERVIÇO GLOBAL: ACESSIBILIDADE
// Futuro Angular: Isso será isolado em um Service injetável (ex: AccessibilityService)
// Função: Gerencia daltonismo, fontes, alto contraste e salva preferências no LocalStorage
// =========================================================
function initAccessibility() {
    const toggles = document.querySelectorAll("#accessibility-toggle, #accessibility-toggle-mobile");
    const menus = document.querySelectorAll("#accessibility-menu, #accessibility-menu-mobile");
  
    if (!toggles.length || !menus.length) return;
  
    toggles.forEach((toggle, idx) => {
      toggle.addEventListener("click", (e) => {
        e.stopPropagation();
        menus[idx].classList.toggle("hidden");
      });
    });
  
    document.addEventListener("click", (e) => {
      if (!e.target.closest(".accessibility-selector") && !e.target.closest(".accessibility-floating")) {
        menus.forEach(menu => menu.classList.add("hidden"));
      }
    });
  
    const selectAll = (action) => document.querySelectorAll(`#${action}, [data-action="${action}"]`);
  
    // --- Tamanho da Fonte ---
    const increaseBtns = selectAll("increase-font");
    const decreaseBtns = selectAll("decrease-font");
    const defaultFontSize = parseFloat(getComputedStyle(document.body).fontSize);
    let currentFontSize = parseFloat(localStorage.getItem("fontSize")) || defaultFontSize;
  
    function applyFontSize(delta) {
      document.querySelectorAll("p, span, a, li, h1, h2, h3, h4, h5, h6, button, label, input, textarea").forEach((el) => {
          const baseSize = parseFloat(getComputedStyle(el).getPropertyValue("font-size"));
          el.style.fontSize = baseSize + delta + "px";
      });
    }
  
    function changeFontSize(delta) {
      currentFontSize += delta;
      applyFontSize(delta);
    }
  
    if (currentFontSize !== defaultFontSize) {
      applyFontSize(currentFontSize - defaultFontSize);
    }
  
    increaseBtns.forEach((btn) => btn.addEventListener("click", () => { changeFontSize(2); localStorage.setItem("fontSize", currentFontSize); }));
    decreaseBtns.forEach((btn) => btn.addEventListener("click", () => { changeFontSize(-2); localStorage.setItem("fontSize", currentFontSize); }));
  
    // --- Filtros Daltonismo ---
    const modes = [
      { name: "Filtros Daltonismo", className: "" },
      { name: "Protanopia", className: "colorblind-protanopia" },
      { name: "Deuteranopia", className: "colorblind-deuteranopia" },
      { name: "Tritanopia", className: "colorblind-tritanopia" },
      { name: "Acromatopsia", className: "colorblind-Acromatopsia" },
    ];
    let savedMode = localStorage.getItem("colorblindMode") || "Filtros Daltonismo";
    let currentModeIndex = modes.findIndex((m) => m.name === savedMode);
    if (currentModeIndex === -1) currentModeIndex = 0;
  
    function applyColorblindMode(index) {
      const classesToRemove = modes.map((m) => m.className).filter(Boolean);
      if (classesToRemove.length) document.body.classList.remove(...classesToRemove);
      const mode = modes[index];
      if (mode.className) document.body.classList.add(mode.className);
      localStorage.setItem("colorblindMode", mode.name);
  
      const desktopBtn = document.querySelector("#colorblind-filter");
      if (desktopBtn) desktopBtn.innerHTML = `<i class="fa fa-low-vision"></i> ${mode.name}`;
    }
  
    applyColorblindMode(currentModeIndex);
  
    selectAll("colorblind-filter").forEach((btn) =>
      btn.addEventListener("click", () => {
        currentModeIndex = (currentModeIndex + 1) % modes.length;
        applyColorblindMode(currentModeIndex);
      })
    );
  
    // --- Leitura em Voz ---
    let speechEnabled = localStorage.getItem("screenReader") === "true";
    let navigationMode = "mouse";
    let lastSpokenElement = null;
  
    function enableSpeech() {
      document.body.addEventListener("mouseover", handleSpeechMouse);
      document.body.addEventListener("focusin", handleSpeechTab);
    }
    function disableSpeech() {
      document.body.removeEventListener("mouseover", handleSpeechMouse);
      document.body.removeEventListener("focusin", handleSpeechTab);
      window.speechSynthesis.cancel();
    }
    function handleSpeechMouse(e) {
      if (!speechEnabled || navigationMode !== "mouse") return;
      if (e.target === lastSpokenElement) return;
      lastSpokenElement = e.target;
      speakTextFromElement(e.target);
    }
    function handleSpeechTab(e) {
      if (!speechEnabled || navigationMode !== "tab") return;
      if (e.target === lastSpokenElement) return;
      lastSpokenElement = e.target;
      speakTextFromElement(e.target);
    }
    function speakTextFromElement(el) {
      const ariaLabel = el.getAttribute?.("aria-label");
      const text = (ariaLabel || el.alt || el.title || el.value || el.innerText || "").trim();
      if (!text) return;
      window.speechSynthesis.cancel();
      window.speechSynthesis.speak(new SpeechSynthesisUtterance(text));
    }
  
    if (speechEnabled) enableSpeech();
  
    selectAll("screen-reader").forEach((btn) =>
      btn.addEventListener("click", () => {
        speechEnabled = !speechEnabled;
        if (speechEnabled) enableSpeech();
        else disableSpeech();
        localStorage.setItem("screenReader", speechEnabled);
      })
    );
  
    window.addEventListener("keydown", (e) => { if (e.key === "Tab") navigationMode = "tab"; });
    window.addEventListener("mousemove", () => { navigationMode = "mouse"; });
  
    // --- Máscara de Leitura, Alto Contraste, Negrito, Espaçamento ---
    const readingMaskOverlay = document.getElementById("reading-mask-overlay");
    let savedAccessibility = JSON.parse(localStorage.getItem("accessibilitySettings")) || {
        readingMask: false, boldText: false, highContrast: false, lineSpacing: "normal"
    };
  
    function saveAccessibility() { localStorage.setItem("accessibilitySettings", JSON.stringify(savedAccessibility)); }
  
    if (savedAccessibility.readingMask && readingMaskOverlay) {
      readingMaskOverlay.style.display = "block";
      document.body.classList.add("reading-mask-active");
    }
    if (savedAccessibility.boldText) document.body.classList.add("bold-text-active");
    if (savedAccessibility.highContrast) document.body.classList.add("high-contrast-active");
    if (savedAccessibility.lineSpacing) {
      document.body.classList.add(
        savedAccessibility.lineSpacing === "small" ? "line-spacing-sm" : savedAccessibility.lineSpacing === "large" ? "line-spacing-lg" : "line-spacing-normal"
      );
    }
  
    selectAll("reading-mask").forEach((btn) =>
      btn.addEventListener("click", () => {
        const active = readingMaskOverlay.style.display === "block";
        readingMaskOverlay.style.display = active ? "none" : "block";
        document.body.classList.toggle("reading-mask-active", !active);
        savedAccessibility.readingMask = !active;
        saveAccessibility();
      })
    );
  
    // Faz a máscara acompanhar o mouse
    document.addEventListener("mousemove", (e) => {
      if (document.body.classList.contains("reading-mask-active") && readingMaskOverlay) {
          const windowElem = readingMaskOverlay.querySelector('.highlight-window');
          if(windowElem) windowElem.style.top = e.clientY + 'px';
      }
    });
  
    selectAll("bold-text").forEach((btn) =>
      btn.addEventListener("click", () => {
        const active = document.body.classList.toggle("bold-text-active");
        savedAccessibility.boldText = active;
        saveAccessibility();
      })
    );
  
    selectAll("high-contrast").forEach((btn) =>
        btn.addEventListener("click", () => {
            const active = document.body.classList.toggle("high-contrast-active");
            savedAccessibility.highContrast = active;
            saveAccessibility();
        })
    );  
  
    function applyLineSpacing(state) {
      document.body.classList.remove("line-spacing-sm", "line-spacing-normal", "line-spacing-lg");
      if (state === "small") document.body.classList.add("line-spacing-sm");
      else if (state === "normal") document.body.classList.add("line-spacing-normal");
      else if (state === "large") document.body.classList.add("line-spacing-lg");
      savedAccessibility.lineSpacing = state;
      saveAccessibility();
    }
    selectAll("increase-line").forEach((btn) => btn.addEventListener("click", () => {
        if (savedAccessibility.lineSpacing === "small") applyLineSpacing("normal");
        else if (savedAccessibility.lineSpacing === "normal") applyLineSpacing("large");
    }));
    selectAll("decrease-line").forEach((btn) => btn.addEventListener("click", () => {
        if (savedAccessibility.lineSpacing === "large") applyLineSpacing("normal");
        else if (savedAccessibility.lineSpacing === "normal") applyLineSpacing("small");
    }));
  
    // --- Resetar ---
    selectAll("reset-accessibility").forEach((btn) =>
      btn.addEventListener("click", () => {
        const removeClasses = [
          "reading-mask-active", "bold-text-active", "high-contrast-active",
          "line-spacing-lg", "line-spacing-sm", "line-spacing-normal",
          "colorblind-protanopia", "colorblind-deuteranopia", "colorblind-tritanopia", "colorblind-Acromatopsia"
        ];
        document.body.classList.remove(...removeClasses);
        if (readingMaskOverlay) readingMaskOverlay.style.display = "none";
  
        document.querySelectorAll("p, span, a, li, h1, h2, h3, h4, h5, h6, button, label, input, textarea").forEach((el) => (el.style.fontSize = ""));
  
        savedAccessibility = { readingMask: false, boldText: false, highContrast: false, lineSpacing: "normal" };
        saveAccessibility();
        localStorage.removeItem("fontSize");
        localStorage.removeItem("colorblindMode");
        localStorage.removeItem("screenReader");
        applyColorblindMode(0); 
  
        if (speechEnabled) {
          disableSpeech();
          speechEnabled = false;
        }
      })
    );
}
// Inicializa o serviço
initAccessibility();


// =========================================================
// 4. LÓGICA DE COMPONENTE/SERVIÇO: MENU DE IDIOMAS (I18N)
// Futuro Angular: O clique do botão vai para header.component.ts.
// =========================================================
const langToggle = document.getElementById('language-toggle');
const langMenu = document.getElementById('language-menu');
const currentFlag = document.getElementById('current-flag');

const translations = {
    pt: {
        nav_consultorias: 'Consultorias',
        nav_como_funciona: 'Como funciona',
        nav_profissional: 'Sou Profissional',
        hero_title: 'Maternidade com o <span>apoio que você merece.</span>',
        hero_subtitle: 'Consultorias gratuitas com psicólogos e advogados, conteúdo especializado e uma comunidade que acolhe — tudo em um só sistema.',
        hero_waitlist: '+1.000 mães já cadastradas',
        hero_access: 'Acessar plataforma',
        login_mae: 'Acesso para Mães',
        login_parceiro: 'Acesso para Parceiros',
        partners_title: 'Apoiado por quem faz a diferença',
        stat_mothers: 'Mães conectadas',
        stat_consultas: 'Consultas Realizadas',
        stat_cities: 'Cidades Alcançadas',
        consult_title_1: 'Saúde Mental:',
        consult_title_1_bold: 'Consultorias',
        consult_desc_1: 'Agende sessões de escuta e acolhimento com psicólogos(as) e advogados(as) voluntárias. Um espaço seguro, 100% gratuito e confidencial para cuidar de você durante a maternidade.',
        consult_btn_1: 'AGENDAR SESSÃO',
        consult_title_2: 'Direitos da Mãe:',
        consult_title_2_bold: 'Orientação Jurídica',
        consult_desc_2: 'Tenha acesso a advogadas parceiras para tirar dúvidas sobre pensão alimentícia, licença-maternidade, guarda e outras questões legais, sem nenhum custo.',
        consult_btn_2: 'FALAR COM ADVOGADA',
        feat_title: 'Tudo o que você precisa em um só lugar',
        feat_subtitle: 'Conheça as ferramentas exclusivas criadas para facilitar a sua jornada na maternidade.',
        feat_1_title: 'Teleconsulta Integrada',
        feat_1_desc: 'Sessões de escuta e orientação jurídica por vídeo, dentro de um ambiente seguro e 100% confidencial.',
        feat_2_title: 'Fórum de Acolhimento',
        feat_2_desc: 'Comunidade moderada por especialistas para você trocar experiências e tirar dúvidas com outras mães.',
        feat_3_title: 'Agendamento Simplificado',
        feat_3_desc: 'Escolha o profissional e o melhor horário para você em apenas dois cliques. Sem burocracia.',
        social_title: 'Apoiando mães <span>reais</span>',
        social_subtitle: 'Veja o que as mães estão falando sobre a nossa rede de apoio.',
        testimon_1: '“O EloMaterno me salvou em um momento de muita angústia. Consegui uma orientação jurídica rápida e gratuita que me deu paz.”',
        testimon_1_role: 'Mãe solo (São Paulo)',
        testimon_2: '“Achei que o processo seria demorado, mas em dois toques agendei uma escuta com uma psicóloga maravilhosa. É um abraço em forma de app.”',
        testimon_2_role: 'Mãe de gêmeos',
        cta_title: 'Pronta para ter o apoio que você merece?',
        cta_subtitle: 'Junte-se a milhares de mães e acesse agora mesmo a sua rede de acolhimento e informação.',
        cta_btn: 'Acessar a Plataforma',
        cta_secure: 'Ambiente 100% seguro, gratuito e confidencial.',
        footer_platform: 'Plataforma',
        footer_support: 'Suporte',
        footer_consultorias: 'Consultorias',
        footer_beneficios: 'Benefícios EloMoedas',
        footer_how: 'Como funciona',
        footer_testimonials: 'Histórias Reais',
        footer_help: 'Central de Ajuda',
        footer_faq: 'Dúvidas Frequentes (FAQ)',
        footer_contact: 'Fale Conosco',
        footer_volunteer: 'Seja uma Voluntária',
        footer_terms: 'Termos de Uso',
        footer_privacy: 'Política de Privacidade',
        prof_nav_how: 'Como funciona',
        prof_nav_platform: 'A Plataforma',
        prof_nav_mothers: 'Para Mães',
        prof_hero_title: 'Fazer a diferença nunca foi<br><span class="scroller-container"><span class="scroller-content"><span class="scroller-item">tão prático.</span><span class="scroller-item">tão impactante.</span><span class="scroller-item">tão humano.</span><span class="scroller-item">tão prático.</span></span></span>',
        prof_hero_subtitle: 'Essa é a plataforma que times usam para manter o foco. Faça parte da nossa rede de apoio. Ofereça sua expertise como voluntário ou invista na transformação social.',
        prof_hero_btn_professional: 'Sou Profissional',
        prof_hero_btn_partner: 'Sou Empresa Parceira',
        prof_panel_title: 'Painel de Atendimentos',
        prof_panel_mothers: 'Mães Apoiadas',
        prof_panel_growth: '12.5% aumento',
        prof_agenda_status: 'Status da Agenda',
        prof_status_active: 'Ativo',
        prof_status_pending: 'Aguardando',
        prof_status_inactive: 'Pausado',
        prof_benefits_title: 'Por que apoiar o EloMaterno?',
        prof_benefits_subtitle: 'Transforme seu investimento em impacto real e mensurável na vida de milhares de famílias.',
        prof_benefits_card_1_title: 'Impacto ESG Direto',
        prof_benefits_card_1_desc: 'Fortaleça a pauta Social (S) do seu ESG. Apoie ativamente a saúde mental, os direitos das mulheres e a reintegração de mães no mercado de trabalho.',
        prof_benefits_card_2_title: 'Transparência de Dados',
        prof_benefits_card_2_desc: 'Tenha acesso a painéis mensuráveis. Saiba exatamente quantas mães foram acolhidas e orientadas graças ao patrocínio da sua marca.',
        prof_benefits_card_3_title: 'Visibilidade de Propósito',
        prof_benefits_card_3_desc: 'Sua marca ganha destaque especial em nossa plataforma como "Parceira Apoiadora", conectando-se a uma causa nobre e urgente.',
        prof_impact_title: 'Como funciona a sua jornada de impacto?',
        prof_impact_subtitle: 'Um processo direto e sem burocracia para você focar no que realmente importa: ajudar.',
        prof_timeline_1: 'Passo 1',
        prof_timeline_2: 'Passo 2',
        prof_timeline_3: 'Passo 3',
        prof_timeline_4: 'Passo 4',
        prof_timeline_title_1: 'Cadastro',
        prof_timeline_title_2: 'Localiza',
        prof_timeline_title_3: 'Ajuda',
        prof_timeline_title_4: 'Conclui',
        prof_for_professionals: 'Para Profissionais',
        prof_for_partners: 'Para Empresas Parceiras',
        prof_section_title_1: 'Atendimento humanizado:',
        prof_section_title_1_bold: 'Consultório Virtual',
        prof_section_desc_1: 'As consultorias são realizadas com apenas um clique. O sistema gera automaticamente um link seguro e o envia para a mãe, permitindo que a chamada seja feita diretamente pelo Google Meet.',
        prof_section_title_2: 'Conexão direta:',
        prof_section_title_2_bold: 'Portal do Parceiro',
        prof_section_desc_2: 'Participe ativamente do dia a dia da nossa comunidade. Nossa plataforma oferece um espaço dedicado para sua empresa publicar conteúdos, divulgar ações e apoiar as mães de perto.',
        prof_agenda_title: 'Sua rotina no controle:',
        prof_agenda_title_bold: 'Gestão de Agenda',
        prof_agenda_desc: 'Organize sua disponibilidade e sincronize tudo com o Google Agenda em poucos cliques.',
        prof_agenda_benefit_1: 'Defina blocos de horários.',
        prof_agenda_benefit_2: 'Sincronia automática.',
        prof_agenda_month: 'Junho 2026',
        prof_agenda_appointment_title: 'Nova consulta agendada',
        prof_agenda_appointment_time: 'Maria S. - Hoje, 14:00',
        prof_agenda_sync_title: 'Sincronização Ativa',
        prof_agenda_sync_connected: 'Conectado à sua conta',
        prof_portal_title: 'Sua Empresa',
        prof_portal_subtitle: 'Painel de Conteúdo',
        prof_portal_post_title: 'Artigo: Retorno ao Mercado',
        prof_portal_post_desc: 'Dicas práticas para mães que buscam novas oportunidades e desejam atualizar seus currículos.',
        prof_portal_tag_1: 'Carreira',
        prof_portal_tag_2: 'Leitura: 5 min',
        prof_portal_status: 'Publicado no portal',
        prof_portal_forum_title: 'Dúvida no Fórum',
        prof_portal_forum_time: 'Há 2 horas',
        prof_portal_forum_question: '“Como funciona a questão da flexibilidade no formato de trabalho híbrido?”',
        prof_portal_forum_reply: 'Empresa respondeu',
        prof_portal_benefit_1: 'Divulgue eventos, vagas e campanhas próprias.',
        prof_portal_benefit_2: 'Publique artigos educativos e informativos.',
        prof_portal_benefit_3: 'Interaja e tire dúvidas no Fórum de Acolhimento.',
        prof_faq_title: 'Dúvidas Frequentes',
        prof_faq_subtitle: 'Tudo o que você precisa saber antes de se juntar à nossa rede.',
        prof_faq_tab_professional: 'Para Profissionais',
        prof_faq_tab_partner: 'Para Empresas Parceiras',
        prof_faq_q1: 'Preciso pagar alguma taxa para atender na plataforma?',
        prof_faq_a1: 'Não. A atuação dos profissionais (psicólogos e advogados) no EloMaterno é 100% voluntária. Nossa plataforma fornece toda a infraestrutura de vídeo e agenda gratuitamente para que você possa focar apenas em ajudar quem precisa.',
        prof_faq_q2: 'Quantas horas por semana preciso dedicar?',
        prof_faq_a2: 'Você tem total controle. Pelo nosso sistema de Gestão de Agenda, você pode abrir blocos de horários de acordo com a sua disponibilidade, seja 1 hora por semana ou 10 horas. A flexibilidade é sua.',
        prof_faq_q3: 'Quem são as mães que vou atender?',
        prof_faq_a3: 'Atendemos mães de diversas regiões que passam por uma triagem no momento do cadastro. O foco principal são mães solo ou em situação de vulnerabilidade que buscam orientação jurídica ou acolhimento psicológico.',
        prof_partner_q1: 'Como nossa empresa pode divulgar eventos ou vagas?',
        prof_partner_a1: 'Temos um painel exclusivo para Parceiros! Lá, sua empresa pode publicar eventos, feiras de empregabilidade, cursos de capacitação e vagas de emprego diretamente para a nossa comunidade de mães, fomentando a reintegração no mercado.',
        prof_partner_q2: 'É possível realizar doações ou patrocínios institucionais?',
        prof_partner_a2: 'Sim! Empresas parceiras podem realizar doações institucionais, patrocinar campanhas específicas ou investir no desenvolvimento de novas ferramentas da plataforma. Todo apoio é revertido para a ampliação do impacto social.',
        prof_partner_q3: 'Nós recebemos relatórios de impacto (ESG)?',
        prof_partner_a3: 'Com certeza. Fornecemos dashboards transparentes e relatórios mensais mostrando quantas vidas foram impactadas através do apoio da sua empresa, dados essenciais para o pilar "Social" das suas metas ESG.'
    },
    en: {
        nav_consultorias: 'Consultations',
        nav_como_funciona: 'How it works',
        nav_profissional: 'I’m a Professional',
        hero_title: 'Motherhood with the <span>support you deserve.</span>',
        hero_subtitle: 'Free consultations with psychologists and lawyers, specialized content, and a welcoming community — all in one system.',
        hero_waitlist: '+1,000 mothers already registered',
        hero_access: 'Access platform',
        login_mae: 'Access for Mothers',
        login_parceiro: 'Access for Partners',
        partners_title: 'Supported by those who make a difference',
        stat_mothers: 'Mothers connected',
        stat_consultas: 'Consultations completed',
        stat_cities: 'Cities reached',
        consult_title_1: 'Mental Health:',
        consult_title_1_bold: 'Consultations',
        consult_desc_1: 'Book listening and support sessions with volunteer psychologists and lawyers. A safe, 100% free, and confidential space to care for you during motherhood.',
        consult_btn_1: 'BOOK A SESSION',
        consult_title_2: 'Mother’s Rights:',
        consult_title_2_bold: 'Legal Guidance',
        consult_desc_2: 'Gain access to partner lawyers to clarify questions about alimony, maternity leave, custody, and other legal matters at no cost.',
        consult_btn_2: 'TALK TO A LAWYER',
        feat_title: 'Everything you need in one place',
        feat_subtitle: 'Discover the exclusive tools created to make your motherhood journey easier.',
        feat_1_title: 'Integrated Teleconsultation',
        feat_1_desc: 'Listening and legal guidance sessions via video, in a safe and 100% confidential environment.',
        feat_2_title: 'Support Forum',
        feat_2_desc: 'A community moderated by specialists so you can share experiences and ask questions with other mothers.',
        feat_3_title: 'Simplified Scheduling',
        feat_3_desc: 'Choose the professional and the best time for you in just two clicks. No bureaucracy.',
        social_title: 'Supporting <span>real</span> mothers',
        social_subtitle: 'See what mothers are saying about our support network.',
        testimon_1: '“EloMaterno saved me in a moment of great distress. I got quick, free legal guidance that brought me peace.”',
        testimon_1_role: 'Single mother (São Paulo)',
        testimon_2: '“I thought the process would be slow, but in two taps I booked a session with a wonderful psychologist. It is a hug in the form of an app.”',
        testimon_2_role: 'Mother of twins',
        cta_title: 'Ready to have the support you deserve?',
        cta_subtitle: 'Join thousands of mothers and access your network of care and information right now.',
        cta_btn: 'Access the Platform',
        cta_secure: '100% safe, free, and confidential environment.',
        footer_platform: 'Platform',
        footer_support: 'Support',
        footer_consultorias: 'Consultations',
        footer_beneficios: 'EloMoedas Benefits',
        footer_how: 'How it works',
        footer_testimonials: 'Real Stories',
        footer_help: 'Help Center',
        footer_faq: 'Frequently Asked Questions (FAQ)',
        footer_contact: 'Contact Us',
        footer_volunteer: 'Become a Volunteer',
        footer_terms: 'Terms of Use',
        footer_privacy: 'Privacy Policy',
        prof_nav_how: 'How it works',
        prof_nav_platform: 'The Platform',
        prof_nav_mothers: 'For Mothers',
        prof_hero_title: 'Making a difference has never been<br><span class="scroller-container"><span class="scroller-content"><span class="scroller-item">so practical.</span><span class="scroller-item">so impactful.</span><span class="scroller-item">so human.</span><span class="scroller-item">so practical.</span></span></span>',
        prof_hero_subtitle: 'This is the platform teams use to stay focused. Become part of our support network. Offer your expertise as a volunteer or invest in social transformation.',
        prof_hero_btn_professional: 'I’m a Professional',
        prof_hero_btn_partner: 'I’m a Partner Company',
        prof_panel_title: 'Appointments Dashboard',
        prof_panel_mothers: 'Mothers Supported',
        prof_panel_growth: '12.5% growth',
        prof_agenda_status: 'Agenda Status',
        prof_status_active: 'Active',
        prof_status_pending: 'Pending',
        prof_status_inactive: 'Paused',
        prof_benefits_title: 'Why support EloMaterno?',
        prof_benefits_subtitle: 'Turn your investment into real, measurable impact in the lives of thousands of families.',
        prof_benefits_card_1_title: 'Direct ESG Impact',
        prof_benefits_card_1_desc: 'Strengthen the Social (S) pillar of your ESG strategy. Actively support mental health, women’s rights, and the reintegration of mothers into the workforce.',
        prof_benefits_card_2_title: 'Data Transparency',
        prof_benefits_card_2_desc: 'Gain access to measurable dashboards. See exactly how many mothers were welcomed and guided thanks to your brand’s sponsorship.',
        prof_benefits_card_3_title: 'Purpose Visibility',
        prof_benefits_card_3_desc: 'Your brand receives special recognition on our platform as an “Supporting Partner,” connecting with a noble and urgent cause.',
        prof_impact_title: 'How does your impact journey work?',
        prof_impact_subtitle: 'A direct and straightforward process so you can focus on what really matters: helping.',
        prof_timeline_1: 'Step 1',
        prof_timeline_2: 'Step 2',
        prof_timeline_3: 'Step 3',
        prof_timeline_4: 'Step 4',
        prof_timeline_title_1: 'Register',
        prof_timeline_title_2: 'Find',
        prof_timeline_title_3: 'Help',
        prof_timeline_title_4: 'Complete',
        prof_for_professionals: 'For Professionals',
        prof_for_partners: 'For Partner Companies',
        prof_section_title_1: 'Humanized care:',
        prof_section_title_1_bold: 'Virtual Office',
        prof_section_desc_1: 'Consultations are done in a single click. The system automatically generates a secure link and sends it to the mother, allowing the call to be made directly via Google Meet.',
        prof_section_title_2: 'Direct connection:',
        prof_section_title_2_bold: 'Partner Portal',
        prof_section_desc_2: 'Take an active part in our community. Our platform offers a dedicated space for your company to publish content, share initiatives, and support mothers closely.',
        prof_agenda_title: 'Your routine in control:',
        prof_agenda_title_bold: 'Agenda Management',
        prof_agenda_desc: 'Organize your availability and sync everything with Google Calendar in just a few clicks.',
        prof_agenda_benefit_1: 'Set time blocks.',
        prof_agenda_benefit_2: 'Automatic sync.',
        prof_agenda_month: 'June 2026',
        prof_agenda_appointment_title: 'New appointment scheduled',
        prof_agenda_appointment_time: 'Maria S. - Today, 2:00 PM',
        prof_agenda_sync_title: 'Sync Active',
        prof_agenda_sync_connected: 'Connected to your account',
        prof_portal_title: 'Your Company',
        prof_portal_subtitle: 'Content Dashboard',
        prof_portal_post_title: 'Article: Return to the Job Market',
        prof_portal_post_desc: 'Practical tips for mothers seeking new opportunities and updating their resumes.',
        prof_portal_tag_1: 'Career',
        prof_portal_tag_2: 'Read: 5 min',
        prof_portal_status: 'Published in the portal',
        prof_portal_forum_title: 'Forum Question',
        prof_portal_forum_time: '2 hours ago',
        prof_portal_forum_question: '“How does flexibility work in a hybrid work format?”',
        prof_portal_forum_reply: 'Company replied',
        prof_portal_benefit_1: 'Promote your own events, vacancies, and campaigns.',
        prof_portal_benefit_2: 'Publish educational and informative articles.',
        prof_portal_benefit_3: 'Interact and ask questions in the Welcome Forum.',
        prof_faq_title: 'Frequently Asked Questions',
        prof_faq_subtitle: 'Everything you need to know before joining our network.',
        prof_faq_tab_professional: 'For Professionals',
        prof_faq_tab_partner: 'For Partner Companies',
        prof_faq_q1: 'Do I need to pay any fee to attend on the platform?',
        prof_faq_a1: 'No. The work of professionals (psychologists and lawyers) on EloMaterno is 100% voluntary. Our platform provides all video and scheduling infrastructure free of charge so you can focus only on helping those in need.',
        prof_faq_q2: 'How many hours per week do I need to dedicate?',
        prof_faq_a2: 'You have full control. With our Agenda Management system, you can open time blocks according to your availability, whether it is 1 hour per week or 10 hours. Flexibility is yours.',
        prof_faq_q3: 'Who are the mothers I will support?',
        prof_faq_a3: 'We support mothers from different regions who go through a screening process during registration. Our main focus is single mothers or mothers in vulnerable situations seeking legal guidance or psychological support.',
        prof_partner_q1: 'How can our company promote events or vacancies?',
        prof_partner_a1: 'We have an exclusive dashboard for Partners! There your company can publish events, employability fairs, training courses, and job openings directly for our mothers’ community, encouraging reintegration into the market.',
        prof_partner_q2: 'Is it possible to make institutional donations or sponsorships?',
        prof_partner_a2: 'Yes! Partner companies can make institutional donations, sponsor specific campaigns, or invest in the development of new platform tools. All support goes toward expanding our social impact.',
        prof_partner_q3: 'Do we receive impact reports (ESG)?',
        prof_partner_a3: 'Absolutely. We provide transparent dashboards and monthly reports showing how many lives were impacted through your company’s support, which are essential for the Social pillar of your ESG goals.'
    },
    es: {
        nav_consultorias: 'Consultas',
        nav_como_funciona: 'Cómo funciona',
        nav_profissional: 'Soy profesional',
        hero_title: 'Maternidad con el <span>apoyo que te mereces.</span>',
        hero_subtitle: 'Consultas gratuitas con psicólogos y abogados, contenido especializado y una comunidad acogedora — todo en un solo sistema.',
        hero_waitlist: '+1.000 madres ya registradas',
        hero_access: 'Acceder a la plataforma',
        login_mae: 'Acceso para Madres',
        login_parceiro: 'Acceso para Aliados',
        partners_title: 'Apoyado por quienes marcan la diferencia',
        stat_mothers: 'Madres conectadas',
        stat_consultas: 'Consultas realizadas',
        stat_cities: 'Ciudades alcanzadas',
        consult_title_1: 'Salud Mental:',
        consult_title_1_bold: 'Consultas',
        consult_desc_1: 'Reserva sesiones de escucha y acompañamiento con psicólogos(as) y abogados(as) voluntarios. Un espacio seguro, 100% gratuito y confidencial para cuidarte durante la maternidad.',
        consult_btn_1: 'RESERVAR SESIÓN',
        consult_title_2: 'Derechos de la Madre:',
        consult_title_2_bold: 'Orientación Jurídica',
        consult_desc_2: 'Ten acceso a abogadas aliadas para resolver dudas sobre pensión alimenticia, licencia de maternidad, custodia y otros temas legales, sin costo alguno.',
        consult_btn_2: 'HABLAR CON UNA ABOGADA',
        feat_title: 'Todo lo que necesitas en un solo lugar',
        feat_subtitle: 'Descubre las herramientas exclusivas creadas para facilitar tu viaje de maternidad.',
        feat_1_title: 'Teleconsulta Integrada',
        feat_1_desc: 'Sesiones de escucha y orientación jurídica por video, en un entorno seguro y 100% confidencial.',
        feat_2_title: 'Foro de Acogida',
        feat_2_desc: 'Una comunidad moderada por especialistas para que compartas experiencias y resuelvas dudas con otras madres.',
        feat_3_title: 'Programación Simplificada',
        feat_3_desc: 'Elige al profesional y el mejor horario para ti en solo dos clics. Sin burocracia.',
        social_title: 'Apoyando a madres <span>reales</span>',
        social_subtitle: 'Mira lo que las madres dicen sobre nuestra red de apoyo.',
        testimon_1: '“EloMaterno me salvó en un momento de gran angustia. Conseguí una orientación jurídica rápida y gratuita que me dio paz.”',
        testimon_1_role: 'Madre soltera (São Paulo)',
        testimon_2: '“Pensé que el proceso tardaría, pero en dos toques reservé una sesión con una maravillosa psicóloga. Es un abrazo en forma de app.”',
        testimon_2_role: 'Madre de gemelos',
        cta_title: '¿Lista para tener el apoyo que te mereces?',
        cta_subtitle: 'Únete a miles de madres y accede ahora mismo a tu red de acompañamiento e información.',
        cta_btn: 'Acceder a la Plataforma',
        cta_secure: 'Entorno 100% seguro, gratuito y confidencial.',
        footer_platform: 'Plataforma',
        footer_support: 'Soporte',
        footer_consultorias: 'Consultas',
        footer_beneficios: 'Beneficios de EloMoedas',
        footer_how: 'Cómo funciona',
        footer_testimonials: 'Historias Reales',
        footer_help: 'Centro de Ayuda',
        footer_faq: 'Preguntas Frecuentes (FAQ)',
        footer_contact: 'Contáctanos',
        footer_volunteer: 'Conviértete en Voluntaria',
        footer_terms: 'Términos de Uso',
        footer_privacy: 'Política de Privacidad',
        prof_nav_how: 'Cómo funciona',
        prof_nav_platform: 'La Plataforma',
        prof_nav_mothers: 'Para Madres',
        prof_hero_title: 'Hacer la diferencia nunca ha sido<br><span class="scroller-container"><span class="scroller-content"><span class="scroller-item">tan práctico.</span><span class="scroller-item">tan impactante.</span><span class="scroller-item">tan humano.</span><span class="scroller-item">tan práctico.</span></span></span>',
        prof_hero_subtitle: 'Esta es la plataforma que los equipos usan para mantenerse enfocados. Forma parte de nuestra red de apoyo. Ofrece tu experiencia como voluntaria o invierte en la transformación social.',
        prof_hero_btn_professional: 'Soy profesional',
        prof_hero_btn_partner: 'Soy empresa aliada',
        prof_panel_title: 'Panel de Atendimientos',
        prof_panel_mothers: 'Madres Apoyadas',
        prof_panel_growth: '12.5% de aumento',
        prof_agenda_status: 'Estado de la Agenda',
        prof_status_active: 'Activo',
        prof_status_pending: 'Esperando',
        prof_status_inactive: 'Pausado',
        prof_benefits_title: '¿Por qué apoyar a EloMaterno?',
        prof_benefits_subtitle: 'Convierte tu inversión en impacto real y medible en la vida de miles de familias.',
        prof_benefits_card_1_title: 'Impacto ESG Directo',
        prof_benefits_card_1_desc: 'Fortalece el pilar Social (S) de tu ESG. Apoya activamente la salud mental, los derechos de las mujeres y la reintegración de las madres al mercado laboral.',
        prof_benefits_card_2_title: 'Transparencia de Datos',
        prof_benefits_card_2_desc: 'Ten acceso a paneles medibles. Descubre exactamente cuántas madres fueron recibidas y guiadas gracias al patrocinio de tu marca.',
        prof_benefits_card_3_title: 'Visibilidad de Propósito',
        prof_benefits_card_3_desc: 'Tu marca recibe un reconocimiento especial en nuestra plataforma como “Aliada Aportadora”, conectándose con una causa noble y urgente.',
        prof_impact_title: '¿Cómo funciona tu recorrido de impacto?',
        prof_impact_subtitle: 'Un proceso directo y sin burocracia para que te concentres en lo que realmente importa: ayudar.',
        prof_timeline_1: 'Paso 1',
        prof_timeline_2: 'Paso 2',
        prof_timeline_3: 'Paso 3',
        prof_timeline_4: 'Paso 4',
        prof_timeline_title_1: 'Registro',
        prof_timeline_title_2: 'Busca',
        prof_timeline_title_3: 'Ayuda',
        prof_timeline_title_4: 'Finaliza',
        prof_for_professionals: 'Para Profesionales',
        prof_for_partners: 'Para Empresas Aliadas',
        prof_section_title_1: 'Atención humanizada:',
        prof_section_title_1_bold: 'Consultorio Virtual',
        prof_section_desc_1: 'Las consultas se realizan con un solo clic. El sistema genera automáticamente un enlace seguro y lo envía a la madre, permitiendo que la llamada se realice directamente por Google Meet.',
        prof_section_title_2: 'Conexión directa:',
        prof_section_title_2_bold: 'Portal del Aliado',
        prof_section_desc_2: 'Participa activamente en el día a día de nuestra comunidad. Nuestra plataforma ofrece un espacio dedicado para que tu empresa publique contenidos, comparta acciones y apoye a las madres de cerca.',
        prof_agenda_title: 'Tu rutina bajo control:',
        prof_agenda_title_bold: 'Gestión de Agenda',
        prof_agenda_desc: 'Organiza tu disponibilidad y sincroniza todo con Google Calendar en pocos clics.',
        prof_agenda_benefit_1: 'Define bloques de horarios.',
        prof_agenda_benefit_2: 'Sincronía automática.',
        prof_agenda_month: 'Junio 2026',
        prof_agenda_appointment_title: 'Nueva consulta agendada',
        prof_agenda_appointment_time: 'Maria S. - Hoy, 14:00',
        prof_agenda_sync_title: 'Sincronización Activa',
        prof_agenda_sync_connected: 'Conectado a tu cuenta',
        prof_portal_title: 'Tu Empresa',
        prof_portal_subtitle: 'Panel de Contenido',
        prof_portal_post_title: 'Artículo: Retorno al Mercado',
        prof_portal_post_desc: 'Consejos prácticos para madres que buscan nuevas oportunidades y desean actualizar sus currículums.',
        prof_portal_tag_1: 'Carrera',
        prof_portal_tag_2: 'Lectura: 5 min',
        prof_portal_status: 'Publicado en el portal',
        prof_portal_forum_title: 'Pregunta en el Foro',
        prof_portal_forum_time: 'Hace 2 horas',
        prof_portal_forum_question: '“¿Cómo funciona la flexibilidad en el formato de trabajo híbrido?”',
        prof_portal_forum_reply: 'La empresa respondió',
        prof_portal_benefit_1: 'Difunde tus propios eventos, vacantes y campañas.',
        prof_portal_benefit_2: 'Publica artículos educativos e informativos.',
        prof_portal_benefit_3: 'Interactúa y resuelve dudas en el Foro de Acogida.',
        prof_faq_title: 'Preguntas Frecuentes',
        prof_faq_subtitle: 'Todo lo que necesitas saber antes de unirte a nuestra red.',
        prof_faq_tab_professional: 'Para Profesionales',
        prof_faq_tab_partner: 'Para Empresas Aliadas',
        prof_faq_q1: '¿Necesito pagar alguna tarifa para atender en la plataforma?',
        prof_faq_a1: 'No. La actuación de los profesionales (psicólogos y abogados) en EloMaterno es 100% voluntaria. Nuestra plataforma ofrece toda la infraestructura de video y agenda de forma gratuita para que puedas centrarte solo en ayudar a quienes lo necesitan.',
        prof_faq_q2: '¿Cuántas horas por semana necesito dedicar?',
        prof_faq_a2: 'Tienes total control. Con nuestro sistema de Gestión de Agenda, puedes abrir bloques de horarios según tu disponibilidad, ya sea 1 hora por semana o 10 horas. La flexibilidad es tuya.',
        prof_faq_q3: '¿Quiénes son las madres que voy a atender?',
        prof_faq_a3: 'Atendemos a madres de diversas regiones que pasan por una selección al momento del registro. El enfoque principal son madres solteras o en situación de vulnerabilidad que buscan orientación jurídica o apoyo psicológico.',
        prof_partner_q1: '¿Cómo puede nuestra empresa divulgar eventos o vacantes?',
        prof_partner_a1: '¡Tenemos un panel exclusivo para Aliados! Ahí, tu empresa puede publicar eventos, ferias de empleabilidad, cursos de capacitación y vacantes de empleo directamente para nuestra comunidad de madres, fomentando la reintegración al mercado.',
        prof_partner_q2: '¿Es posible realizar donaciones o patrocinios institucionales?',
        prof_partner_a2: 'Sí. Las empresas aliadas pueden realizar donaciones institucionales, patrocinar campañas específicas o invertir en el desarrollo de nuevas herramientas de la plataforma. Todo apoyo se destina a ampliar el impacto social.',
        prof_partner_q3: '¿Recibimos reportes de impacto (ESG)?',
        prof_partner_a3: 'Claro. Ofrecemos dashboards transparentes y reportes mensuales mostrando cuántas vidas fueron impactadas gracias al apoyo de tu empresa, datos esenciales para el pilar “Social” de tus metas ESG.'
    }
};

function applyLanguage(lang) {
    const selectedLang = translations[lang] ? lang : 'pt';
    const dictionary = translations[selectedLang];

    document.documentElement.lang = selectedLang === 'pt' ? 'pt-BR' : selectedLang;
    document.documentElement.setAttribute('data-lang', selectedLang);

    if (currentFlag) {
        const flagCode = selectedLang === 'pt' ? 'br' : selectedLang === 'en' ? 'us' : 'es';
        currentFlag.src = `https://flagcdn.com/w20/${flagCode}.png`;
        currentFlag.alt = selectedLang === 'pt' ? 'Português' : selectedLang === 'en' ? 'English' : 'Español';
    }

    if (langToggle) {
        const labels = { pt: 'Mudar idioma', en: 'Change language', es: 'Cambiar idioma' };
        langToggle.setAttribute('aria-label', labels[selectedLang]);
    }

    document.querySelectorAll('[data-i18n]').forEach((element) => {
        const key = element.getAttribute('data-i18n');
        const value = dictionary[key];

        if (!value) return;

        if (element.getAttribute('data-i18n-html') === 'true') {
            element.innerHTML = value;
        } else {
            element.textContent = value;
        }
    });

    localStorage.setItem('preferredLanguage', selectedLang);
}

if (langToggle && langMenu) {
    langToggle.addEventListener('click', (e) => {
        e.stopPropagation();
        langMenu.classList.toggle('hidden');

        const accMenu = document.getElementById('accessibility-menu');
        if (accMenu) accMenu.classList.add('hidden');
    });

    langMenu.querySelectorAll('li').forEach((item) => {
        item.addEventListener('click', () => {
            const lang = item.getAttribute('data-lang');
            applyLanguage(lang);
            langMenu.classList.add('hidden');
        });
    });

    document.addEventListener('click', (e) => {
        if (!e.target.closest('.language-selector')) {
            langMenu.classList.add('hidden');
        }
    });
}

applyLanguage(localStorage.getItem('preferredLanguage') || 'pt');

// =========================================================
// 5. ANIMAÇÃO DE CONTADOR (ESTATÍSTICAS)
// =========================================================
const counters = document.querySelectorAll('.counter');
const speed = 150; // Quanto menor o número, mais rápida é a animação

// Cria o observador para identificar quando a seção aparece na tela
const counterObserver = new IntersectionObserver((entries, observer) => {
    entries.forEach(entry => {
        // Se a seção entrou na tela
        if (entry.isIntersecting) {
            const counter = entry.target;
            
            // Função que faz a contagem
            const updateCount = () => {
                // Pega o número final alvo (data-target do HTML)
                const target = +counter.getAttribute('data-target');
                // Pega o número atual na tela (começa em 0)
                const count = +counter.innerText;

                // Calcula o incremento (passos da animação)
                const inc = target / speed;

                // Se o número atual for menor que o alvo, continua somando
                if (count < target) {
                    counter.innerText = Math.ceil(count + inc);
                    setTimeout(updateCount, 15); // Chama a função novamente a cada 15ms
                } else {
                    // Garante que o número final seja exato ao chegar no fim
                    counter.innerText = target;
                }
            };

            updateCount();
            // Para de observar depois que animou uma vez, para não repetir se a usuária rolar para cima e para baixo
            observer.unobserve(counter);
        }
    });
}, { 
    threshold: 0.5 // Só dispara a animação quando pelo menos 50% da seção estiver visível
});

// Aplica o observador em cada número que tem a classe .counter
counters.forEach(counter => {
    counterObserver.observe(counter);
});


// =========================================================
// 6. SISTEMA DE PRIVACIDADE (BLOQUEIO NO LOGIN)
// =========================================================
document.addEventListener('DOMContentLoaded', () => {
    
    // 1. Seleção de Elementos
    const pageBody = document.querySelector('body');
    const pageOverlay = document.getElementById('page-overlay');
    const cookieBanner = document.getElementById('cookie-banner');
    const preferencesModal = document.getElementById('preferences-modal');
    const cookieWidget = document.getElementById('cookie-widget');
    
    const acceptBannerBtn = document.getElementById('banner-btn-accept');
    const prefsBannerBtn = document.getElementById('banner-btn-prefs');
    const bannerLinkPrefs = document.getElementById('banner-link-prefs');

    const closeModalBtn = document.getElementById('close-modal');
    const acceptModalBtn = document.getElementById('modal-accept-all');
    const consentCheckbox = document.getElementById('consent-checkbox');
    
    const modalTitle = document.getElementById('modal-title');
    const tabNecessarios = document.getElementById('tab-necessarios');
    const tabPoliticas = document.getElementById('tab-politicas');
    const contentNecessarios = document.getElementById('content-necessarios');
    const contentPoliticas = document.getElementById('content-politicas');

    // Botões que chamam o sistema (Header e Footer)
    const loginButtons = document.querySelectorAll('.btn-login-trigger');

    // CHAVE DO NAVEGADOR
    const consentKey = 'eloMaterno_TermosAceitos';

    // 🚨 APAGADOR DE MEMÓRIA (Use apenas enquanto estiver testando o site!)
    localStorage.removeItem(consentKey);

    // 2. Funções

    function acceptPolicies() {
        localStorage.setItem(consentKey, 'true'); 
        
        pageBody.classList.remove('blocked');
        if(pageOverlay) pageOverlay.classList.add('hidden');
        if(cookieBanner) cookieBanner.classList.add('hidden');
        if(preferencesModal) preferencesModal.classList.add('hidden');

        // Redireciona corretamente para o formulário após aceitar!
        window.location.href = "formPerfil.html"; 
    }

    // Abre o modal de preferências a partir do Banner
    function showPreferences() {
        if(cookieBanner) cookieBanner.classList.add('hidden');
        if(preferencesModal) preferencesModal.classList.remove('hidden');
        if(pageOverlay) pageOverlay.classList.remove('hidden'); 
    }
    
    // Abre o modal de preferências a partir da bolinha do canto
    function showPreferencesFromWidget() {
        if(preferencesModal) preferencesModal.classList.remove('hidden');
        if(pageOverlay) pageOverlay.classList.remove('hidden'); 
    }

    // Fecha a telinha branca de preferências
    function closeModal() {
        if(preferencesModal) preferencesModal.classList.add('hidden');
        
        // Se ela ainda NÃO ACEITOU e tinha clicado em Acessar, volta pro Banner
        if (localStorage.getItem(consentKey) !== 'true' && pageBody.classList.contains('blocked')) {
            if(cookieBanner) cookieBanner.classList.remove('hidden');
        } else {
            // Se ela fechou e não estava bloqueada (clicou pela bolinha), tira o fundo escuro
            if(pageOverlay) pageOverlay.classList.add('hidden');
        }
    }

    // A MÁGICA ACONTECE AQUI: O que acontece quando clica em "Acessar Agora"
    function handleLoginClick(e) {
        e.preventDefault(); // Impede o link de funcionar na hora
        
        const hasAccepted = localStorage.getItem(consentKey) === 'true';

        if (hasAccepted) {
            // Se JÁ ACEITOU antes, vai direto pro link de login
            window.location.href = "formPerfil.html"; 
        } else {
            // Se NUNCA ACEITOU, a tela escurece e o aviso aparece bloqueando
            pageBody.classList.add('blocked');
            if(pageOverlay) pageOverlay.classList.remove('hidden'); 
            if(cookieBanner) cookieBanner.classList.remove('hidden'); 
        }
    }

    // Garante que o site carrega limpo e apenas a bolinha aparece
    function checkInitialConsent() {
        if (cookieWidget) {
            cookieWidget.classList.remove('hidden'); // Bolinha sempre visível
        }
        // Garante que o body não inicia bloqueado
        pageBody.classList.remove('blocked');
    }

    // 3. Eventos
    // Aplica o bloqueio nos botões de Acessar Agora
    loginButtons.forEach(btn => btn.addEventListener('click', handleLoginClick));

    if(acceptBannerBtn) acceptBannerBtn.addEventListener('click', acceptPolicies);
    if(prefsBannerBtn) prefsBannerBtn.addEventListener('click', showPreferences);
    if(bannerLinkPrefs) bannerLinkPrefs.addEventListener('click', (e) => { e.preventDefault(); showPreferences(); });
    if(closeModalBtn) closeModalBtn.addEventListener('click', closeModal);
    if(acceptModalBtn) acceptModalBtn.addEventListener('click', acceptPolicies);
    
    // Clique na bolinha flutuante
    if(cookieWidget) cookieWidget.addEventListener('click', showPreferencesFromWidget);

    if(consentCheckbox && acceptModalBtn) {
        consentCheckbox.addEventListener('change', () => {
            acceptModalBtn.disabled = !consentCheckbox.checked;
            acceptModalBtn.innerText = consentCheckbox.checked ? "Confirmar e Entrar" : "Confirme o Aceite";
        });
    }

    if(tabNecessarios) {
        tabNecessarios.addEventListener('click', () => {
            if(modalTitle) modalTitle.innerText = "Cookies Estritamente Necessários";
            tabNecessarios.classList.add('active');
            tabPoliticas.classList.remove('active');
            contentNecessarios.classList.remove('hidden');
            contentPoliticas.classList.add('hidden');
        });
    }
    
    if(tabPoliticas) {
        tabPoliticas.addEventListener('click', () => {
            if(modalTitle) modalTitle.innerText = "Nossas Políticas";
            tabPoliticas.classList.add('active');
            tabNecessarios.classList.remove('active');
            contentPoliticas.classList.remove('hidden');
            contentNecessarios.classList.add('hidden');
        });
    }

    // Inicializa as regras limpas ao abrir a página
    checkInitialConsent();
});

// =========================================================
// 7. MENU HAMBÚRGUER (MOBILE)
// =========================================================
document.addEventListener("DOMContentLoaded", () => {
    const mobileMenuBtn = document.getElementById('mobile-menu-btn');
    const navMenu = document.getElementById('nav-menu');
    const mobileAccessibilityBtn = document.getElementById('mobile-accessibility-toggle');
    const mobileThemeBtn = document.getElementById('mobile-theme-toggle');
    const mobileLanguageBtn = document.getElementById('mobile-language-toggle');
    const mobileLanguageMenu = document.getElementById('mobile-language-menu');

    const closeMobileMenu = () => {
        navMenu?.classList.remove('active');
        const icon = mobileMenuBtn?.querySelector('i');
        if (icon) {
            icon.classList.remove('fa-xmark');
            icon.classList.add('fa-bars');
        }
    };

    if (mobileMenuBtn && navMenu) {
        mobileMenuBtn.addEventListener('click', () => {
            navMenu.classList.toggle('active');
            const icon = mobileMenuBtn.querySelector('i');
            if (navMenu.classList.contains('active')) {
                icon.classList.remove('fa-bars');
                icon.classList.add('fa-xmark');
            } else {
                icon.classList.remove('fa-xmark');
                icon.classList.add('fa-bars');
            }
        });

        navMenu.querySelectorAll('a, button').forEach(link => {
            link.addEventListener('click', () => {
                if (link.id === 'mobile-accessibility-toggle' || link.id === 'mobile-theme-toggle' || link.id === 'mobile-language-toggle') return;
                closeMobileMenu();
            });
        });
    }

    if (mobileLanguageBtn && mobileLanguageMenu) {
        mobileLanguageBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            mobileLanguageMenu.classList.toggle('hidden');
            const accMenu = document.getElementById('accessibility-menu');
            if (accMenu) accMenu.classList.add('hidden');
            const desktopLangMenu = document.getElementById('language-menu');
            if (desktopLangMenu) desktopLangMenu.classList.add('hidden');
        });

        mobileLanguageMenu.querySelectorAll('li').forEach((item) => {
            item.addEventListener('click', () => {
                const lang = item.getAttribute('data-lang');
                applyLanguage(lang);
                mobileLanguageMenu.classList.add('hidden');
                closeMobileMenu();
            });
        });

        document.addEventListener('click', (e) => {
            if (!e.target.closest('.mobile-language-selector')) {
                mobileLanguageMenu.classList.add('hidden');
            }
        });
    }

    if (mobileAccessibilityBtn) {
        mobileAccessibilityBtn.addEventListener('click', () => {
            document.getElementById('accessibility-toggle')?.click();
            closeMobileMenu();
        });
    }

    if (mobileThemeBtn) {
        mobileThemeBtn.addEventListener('click', () => {
            document.getElementById('theme-toggle')?.click();
            closeMobileMenu();
        });
    }
});


        document.addEventListener("DOMContentLoaded", () => {
            const loginBtn = document.getElementById('login-dropdown-btn');
            const loginWrapper = loginBtn ? loginBtn.closest('.login-dropdown-wrapper') : null;

            if (loginBtn && loginWrapper) {
                // Abre/fecha ao clicar no botão
                loginBtn.addEventListener('click', (e) => {
                    e.preventDefault();
                    e.stopPropagation(); 
                    loginWrapper.classList.toggle('active');
                });

                // Fecha se clicar em qualquer outro lugar da tela
                document.addEventListener('click', (e) => {
                    if (!loginWrapper.contains(e.target)) {
                        loginWrapper.classList.remove('active');
                    }
                });
            }
        });
  
        // SCRIPT DO FAQ (TABS & ACORDEÃO)
        document.addEventListener("DOMContentLoaded", () => {
            // 1. Controle das Abas (Profissional vs Empresa)
            const tabs = document.querySelectorAll('.faq-tab');
            const contents = document.querySelectorAll('.faq-content-wrapper');

            tabs.forEach(tab => {
                tab.addEventListener('click', () => {
                    // Remove ativo de todas as abas e conteúdos
                    tabs.forEach(t => t.classList.remove('active'));
                    contents.forEach(c => c.classList.remove('active'));

                    // Adiciona ativo na clicada
                    tab.classList.add('active');
                    const targetId = tab.getAttribute('data-target');
                    document.getElementById(targetId).classList.add('active');
                });
            });

            // 2. Controle do Acordeão (Abrir e Fechar Perguntas)
            const faqQuestions = document.querySelectorAll('.faq-question');

            faqQuestions.forEach(question => {
                question.addEventListener('click', () => {
                    const item = question.parentElement;
                    const isActive = item.classList.contains('active');

                    // Se quiser que apenas UMA pergunta fique aberta por vez, descomente a linha abaixo:
                    // document.querySelectorAll('.faq-item').forEach(i => i.classList.remove('active'));

                    if (!isActive) {
                        item.classList.add('active');
                    } else {
                        item.classList.remove('active');
                    }
                });
            });
        });
    
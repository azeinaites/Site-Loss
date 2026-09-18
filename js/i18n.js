(function () {
  var STORAGE_KEY = "loss-lang";

  var I18N = {
    pt: {
      title: "Loss — Stoner Rock de Belo Horizonte",
      meta_description: "Loss é um power trio de stoner rock de Belo Horizonte (MG), no cast da produtora Som do Darma. Conheça a banda, a discografia e a imprensa.",

      nav_toggle_aria: "Abrir menu",
      scrollcue_aria: "Rolar para a próxima seção",
      nav_sobre: "A banda",
      nav_discografia: "Discografia",
      nav_midia: "Na mídia",
      nav_fotos: "Estrada",
      nav_jogo: "Jogo",
      nav_loja: "Loja",
      nav_contato: "Contato",
      nav_links: "Links",

      hero_bg_alt: "Capa do álbum ao vivo Loss — Live in London, A Night at Cart & Horses",
      hero_kicker: "Belo Horizonte, Brasil",
      hero_title: "Riff pesado, raiz mineira, sonoridade moderna.",
      hero_lede: "Loss é um power trio que carrega a força e o peso do rock clássico, mas sem abrir mão de referências modernas e influências diversas.<br><br>O vocal pesado e o baixo marcante de Marcelo, somados à guitarra virtuosa de Adriano e à bateria consistente de Teddy, dão origem a um som único que nos leva de volta às origens do estilo, mas traz um sopro de modernidade ao rock.",
      hero_btn_primary: "Ouvir a discografia",
      hero_btn_ghost: "Ler a imprensa",

      sobre_eyebrow: "A banda",
      sobre_h2: "Três músicos, um som que não pede desculpas.",
      sobre_p1: "Fundada em 2020 em Belo Horizonte (MG), a Loss reúne o vocalista e baixista Marcelo Loss, fundador da banda Concreto, com a qual gravou 7 álbuns; o baterista Teddy Bronsk, fundador da lendária banda Witchhammer, uma das pioneiras do metal nacional na década de 80; e Adriano Avelar, com passagem pela Caxakustica e participações ao lado de artistas variados do cenário nacional.",
      sobre_p2: "A referência do trio está na raiz do hard rock e do metal mundial. Black Sabbath, Deep Purple, Led Zeppelin, Rush e Van Halen aparecem nas camadas de guitarra, no groove do baixo, no peso da bateria e nas melodias da banda, muitas vezes misturados a temperos da música brasileira. O som pouco convencional da Loss chamou a atenção dos gringos e já a levou a duas turnês europeias, passando por capitais como Londres, Paris, Amsterdã, Madri, Lisboa, além de cidades da Alemanha, Bélgica, Irlanda e Portugal. A mais recente tour, a Human Factor European Tour, de 2025, rendeu o ao vivo Live in London (A Night At Cart & Horses). O álbum foi gravado no lendário pub londrino, famoso por ter sido palco das primeiras apresentações do Iron Maiden.",
      sobre_fact1_dt: "Formação",
      sobre_fact2_dt: "Integrantes",
      sobre_fact2_dd: "Marcelo Loss — voz e baixo<br>Adriano Avelar — guitarra e vocais<br>Teddy Bronsk — bateria",
      sobre_fact3_dt: "Selo",
      sobre_fact4_dt: "Influências",

      discografia_eyebrow: "Discografia",
      discografia_h2: "Quatro capítulos, do estúdio em BH a um disco ao vivo em Londres.",
      disco1_p: "EP de estreia com quatro faixas autorais, gravada no Estúdio Riff (BH) e com mixagem e masterização do produtor dinamarquês Tue Madsen, que já trabalhou com nomes como Rob Halford e Meshuggah.",
      disco2_span: "Álbum",
      disco2_p: "Primeiro álbum de estúdio e primeiro lançamento pela DyMM Records (Lisboa / Londres). Onze faixas em português e inglês, gravadas no Analog Dream Studio (BH) e mixadas em Atenas, na Grécia, por Jim Siou.",
      disco3_span: "Álbum",
      disco3_p: "Segundo álbum, com temática conceitual sobre o atrito entre o ser humano e a máquina. Gravado no Analog Dream Studio e mixado por Tue Madsen na Dinamarca.",
      disco4_span: "A Night at Cart &amp; Horses — Ao vivo",
      disco4_p: "Registro ao vivo gravado no Cart &amp; Horses, o pub de Londres onde o Iron Maiden se apresentou no início da carreira. A Loss se torna uma das poucas bandas brasileiras a levar seu som pesado para esse endereço.",

      midia_eyebrow: "Imprensa",
      midia_h2: "O que estão dizendo sobre a Loss.",
      midia_nacional_h3: "Mídia nacional",
      midia_internacional_h3: "Mídia internacional",
      link_nat_1: "Loss lança álbum \"Storm\", primeiro pelo selo europeu DyMM Records",
      link_nat_2: "Sonoridade calcada no stoner, com referências a outros subgêneros do peso",
      link_nat_3: "Loss no YouTube",
      link_nat_4: "O fator humano por trás do peso: maturidade, estrada e resistência",
      link_nat_5: "Já disponível \"Live In London — A Night At Cart &amp; Horses\", álbum ao vivo da Loss gravado em Londres",
      link_nat_6: "Loss inicia nesta semana sua segunda turnê europeia",
      link_nat_7: "Resenha — Loss — Human Factor",
      link_nat_8: "Hard rock protagoniza novo single da Loss sobre aceitação e resiliência",
      link_int_1: "Resenha do álbum \"Storm\" (2022)",
      link_int_2: "Resenha do álbum \"Human Factor\" (2024)",
      link_int_5: "Banda mineira Loss realizará turnê pela Europa em 2022",

      estrada_eyebrow: "Na estrada",
      estrada_h2: "Brasil, Europa, uma cidade de cada vez.",
      estrada_photo_alt: "A banda Loss ao lado de um sofá vermelho encontrado numa calçada na Holanda",
      estrada_figcaption: "Holanda",
      estrada_cta_btn: "Ver galeria completa da turnê",

      jogo_eyebrow: "Jogo",
      jogo_p: "Um beat 'em up 2D em que Robustus, um ciborgue construído a partir das próprias músicas da banda, enfrenta diversos inimigos antimusicais para ajudar a banda, começando por Belo Horizonte e passando por cidades da Europa aonde a Loss tocou. Feito em HTML5 Canvas, roda direto no navegador — sem instalar nada.",
      jogo_btn: "Jogar agora",
      jogo_photo_alt: "Cena do jogo L.O.S.S — The Human Factor Tour, com Robustus na galeria de memorabília heavy metal",

      loja_eyebrow: "Loja",
      loja_p: "Camisetas, vinis e itens do álbum \"Live in London\", com a comodidade do Mercado Livre. Clique no logo ao lado!!!",

      contato_eyebrow: "Contato",
      contato_h2: "Shows, imprensa e parcerias.",
      contato_p: "Para agenda de shows, entrevistas e imprensa, escreva direto para a banda ou siga nas redes.",
      contato_list_linktree: "Linktree — todos os links",
      contato_label_nome: "Nome",
      contato_label_email: "E-mail",
      contato_label_mensagem: "Mensagem",
      contato_submit: "Enviar mensagem",

      footer_copy: "Loss. Stoner rock de Belo Horizonte, MG — Brasil.",

      form_subject_contact: "Contato pelo site",
      form_note_sending: "Abrindo seu app de e-mail para confirmar o envio…",

      gal_title: "Galeria de fotos — Loss",
      gal_meta_description: "Galeria de fotos da Loss na estrada — Brasil e turnês europeias, shows, bastidores e paisagens.",
      gal_back: "← Voltar para o site",
      gal_h1: "Galeria de fotos.",
      gal_p: "Bastidores, palcos e cidades da turnê da Loss pelo Brasil e pela Europa. Clique numa foto para ver em tamanho maior.",

      gal_cap_00: "Cartaz da turnê europeia 2025",
      gal_alt_00: "Cartaz da turnê europeia The Human Factor, com datas em Paris, Eernegem, Bree, Amsterdã, Oer-Erkenschwick, Londres e Dundalk",
      gal_cap_01: "Amsterdã, Holanda",
      gal_alt_01: "Marcelo Loss, Adriano Avelar e Teddy Bronsk às margens de um canal em Amsterdã, Holanda",
      gal_cap_02: "Holanda",
      gal_alt_02: "Logo da Loss sobre foto da banda ao lado do sofá vermelho encontrado na Holanda",
      gal_cap_03: "Studio Pub",
      gal_alt_03: "Loss se apresentando no telão do Studio Pub, com o público cantando junto",
      gal_cap_04: "Live in London",
      gal_alt_04: "Marcelo Loss e Adriano Avelar no palco do show que deu origem ao álbum Live in London",
      gal_cap_05: "Ao vivo",
      gal_alt_05: "Teddy Bronsk tocando bateria ao vivo, com bandana rosa, em show de grande porte",
      gal_cap_06: "Bandeira de Minas Gerais no palco",
      gal_alt_06: "A banda e o público seguram no palco a bandeira com o brasão e o lema de Minas Gerais",
      gal_cap_07: "Ao vivo",
      gal_alt_07: "Adriano Avelar e Marcelo Loss em show com iluminação colorida",
      gal_cap_08: "Depois do show",
      gal_alt_08: "Loss ao lado da plateia depois do show",
      gal_cap_09: "Irlanda",
      gal_alt_09: "Marcelo Loss, Teddy Bronsk e Adriano Avelar sentados na escadaria de uma igreja na Irlanda",
      gal_cap_10: "Cart &amp; Horses, Londres",
      gal_alt_10: "A banda em frente à fachada do Cart & Horses, pub londrino onde o Iron Maiden se apresentou no início da carreira",
      gal_cap_11: "Festival",
      gal_alt_11: "Loss se apresentando em festival ao ar livre, à noite",
      gal_cap_12: "Paris, França",
      gal_alt_12: "Marcelo Loss, Adriano Avelar e Teddy Bronsk em frente à Torre Eiffel, em Paris",
      gal_cap_13: "Plateia",
      gal_alt_13: "Público fazendo headbang durante apresentação da Loss",
      gal_cap_14: "Ao vivo",
      gal_alt_14: "Adriano Avelar tocando guitarra em palco com vitrais coloridos ao fundo",
      gal_cap_15: "No palco",
      gal_alt_15: "Loss posando no palco com o público ao fundo, em clima festivo"
    },

    en: {
      title: "Loss — Stoner Rock from Belo Horizonte, Brazil",
      meta_description: "Loss is a stoner rock power trio from Belo Horizonte, Brazil, signed to Som do Darma. Discover the band, the discography and the press.",

      nav_toggle_aria: "Open menu",
      scrollcue_aria: "Scroll to next section",
      nav_sobre: "The band",
      nav_discografia: "Discography",
      nav_midia: "Press",
      nav_fotos: "On the road",
      nav_jogo: "Game",
      nav_loja: "Store",
      nav_contato: "Contact",
      nav_links: "Links",

      hero_bg_alt: "Cover of Loss' live album, Live in London — A Night at Cart & Horses",
      hero_kicker: "Belo Horizonte, Brazil",
      hero_title: "Heavy riffs, Brazilian roots, modern sound.",
      hero_lede: "Loss is a power trio that carries the force and weight of classic rock without giving up modern references and diverse influences.<br><br>Marcelo's heavy vocals and driving bass, together with Adriano's virtuoso guitar and Teddy's rock-solid drums, give rise to a unique sound that takes us back to the genre's origins while bringing a breath of modernity to rock.",
      hero_btn_primary: "Listen to the discography",
      hero_btn_ghost: "Read the press",

      sobre_eyebrow: "The band",
      sobre_h2: "Three musicians, a sound that makes no apologies.",
      sobre_p1: "Founded in 2020 in Belo Horizonte, Brazil, Loss brings together vocalist and bassist Marcelo Loss, founder of the band Concreto, with which he recorded 7 albums; drummer Teddy Bronsk, founder of the legendary band Witchhammer, one of the pioneers of Brazilian metal in the 1980s; and Adriano Avelar, who played with Caxakustica and appeared alongside various artists on the national scene.",
      sobre_p2: "The trio's reference point lies in the roots of hard rock and metal worldwide. Black Sabbath, Deep Purple, Led Zeppelin, Rush and Van Halen surface in the guitar layers, the bass groove, the weight of the drums and the band's melodies, often blended with the flavors of Brazilian music. Loss' unconventional sound caught the attention of audiences abroad and has already taken the band on two European tours, through capitals such as London, Paris, Amsterdam, Madrid and Lisbon, as well as cities in Germany, Belgium, Ireland and Portugal. The most recent tour, the Human Factor European Tour in 2025, produced the live album Live in London (A Night At Cart & Horses). The album was recorded at the legendary London pub, famous for having hosted Iron Maiden's earliest shows.",
      sobre_fact1_dt: "Founded",
      sobre_fact2_dt: "Members",
      sobre_fact2_dd: "Marcelo Loss — vocals and bass<br>Adriano Avelar — guitar and vocals<br>Teddy Bronsk — drums",
      sobre_fact3_dt: "Label",
      sobre_fact4_dt: "Influences",

      discografia_eyebrow: "Discography",
      discografia_h2: "Four chapters, from a studio in Belo Horizonte to a live album in London.",
      disco1_p: "Debut EP with four original tracks, recorded at Estúdio Riff (Belo Horizonte) with mixing and mastering by Danish producer Tue Madsen, who has worked with names like Rob Halford and Meshuggah.",
      disco2_span: "Album",
      disco2_p: "First studio album and first release through DyMM Records (Lisbon / London). Eleven tracks in Portuguese and English, recorded at Analog Dream Studio (Belo Horizonte) and mixed in Athens, Greece, by Jim Siou.",
      disco3_span: "Album",
      disco3_p: "Second album, built around a concept exploring the friction between humans and machines. Recorded at Analog Dream Studio and mixed by Tue Madsen in Denmark.",
      disco4_span: "A Night at Cart &amp; Horses — Live",
      disco4_p: "Live recording made at Cart &amp; Horses, the London pub where Iron Maiden played their earliest shows. Loss becomes one of the few Brazilian bands to bring its heavy sound to that stage.",

      midia_eyebrow: "Press",
      midia_h2: "What they're saying about Loss.",
      midia_nacional_h3: "Brazilian press",
      midia_internacional_h3: "International press",
      link_nat_1: "Loss releases \"Storm\" album, its first through European label DyMM Records",
      link_nat_2: "A sound rooted in stoner, with nods to other heavy subgenres",
      link_nat_3: "Loss on YouTube",
      link_nat_4: "The human factor behind the weight: maturity, the road and resilience",
      link_nat_5: "\"Live In London — A Night At Cart &amp; Horses\" out now, Loss' live album recorded in London",
      link_nat_6: "Loss kicks off its second European tour this week",
      link_nat_7: "Review — Loss — Human Factor",
      link_nat_8: "Hard rock takes the spotlight in Loss' new single about acceptance and resilience",
      link_int_1: "\"Storm\" album review (2022)",
      link_int_2: "\"Human Factor\" album review (2024)",
      link_int_5: "Minas Gerais band Loss to tour Europe in 2022",

      estrada_eyebrow: "On the road",
      estrada_h2: "Brazil, Europe, one city at a time.",
      estrada_photo_alt: "The band Loss next to a red couch found on a sidewalk in the Netherlands",
      estrada_figcaption: "Netherlands",
      estrada_cta_btn: "View the full tour gallery",

      jogo_eyebrow: "Game",
      jogo_p: "A 2D beat 'em up in which Robustus, a cyborg built from the band's own songs, faces off against a series of anti-musical enemies to help the band, starting in Belo Horizonte and moving through the European cities where Loss has played. Built in HTML5 Canvas, it runs straight in the browser — nothing to install.",
      jogo_btn: "Play now",
      jogo_photo_alt: "Scene from the L.O.S.S — The Human Factor Tour game, with Robustus in the heavy metal memorabilia gallery",

      loja_eyebrow: "Store",
      loja_p: "T-shirts, vinyl records and items from the \"Live in London\" album, with the convenience of Mercado Livre. Click the logo to the side!!!",

      contato_eyebrow: "Contact",
      contato_h2: "Shows, press and partnerships.",
      contato_p: "For show bookings, interviews and press, write directly to the band or follow along on social media.",
      contato_list_linktree: "Linktree — all links",
      contato_label_nome: "Name",
      contato_label_email: "Email",
      contato_label_mensagem: "Message",
      contato_submit: "Send message",

      footer_copy: "Loss. Stoner rock from Belo Horizonte, Brazil.",

      form_subject_contact: "Website contact",
      form_note_sending: "Opening your email app to confirm sending…",

      gal_title: "Photo Gallery — Loss",
      gal_meta_description: "Loss on the road — photo gallery from Brazil and European tours: shows, backstage moments and scenery.",
      gal_back: "← Back to the site",
      gal_h1: "Photo gallery.",
      gal_p: "Behind the scenes, stages and cities from Loss' tour across Brazil and Europe. Click a photo to see it full-size.",

      gal_cap_00: "2025 European tour poster",
      gal_alt_00: "Poster for the Human Factor European Tour, with dates in Paris, Eernegem, Bree, Amsterdam, Oer-Erkenschwick, London and Dundalk",
      gal_cap_01: "Amsterdam, Netherlands",
      gal_alt_01: "Marcelo Loss, Adriano Avelar and Teddy Bronsk by a canal in Amsterdam, Netherlands",
      gal_cap_02: "Netherlands",
      gal_alt_02: "Loss logo over a photo of the band next to the red couch found in the Netherlands",
      gal_cap_03: "Studio Pub",
      gal_alt_03: "Loss performing on the big screen at Studio Pub, with the crowd singing along",
      gal_cap_04: "Live in London",
      gal_alt_04: "Marcelo Loss and Adriano Avelar on stage at the show that became the Live in London album",
      gal_cap_05: "Live",
      gal_alt_05: "Teddy Bronsk playing drums live, wearing a pink bandana, at a large show",
      gal_cap_06: "Minas Gerais flag on stage",
      gal_alt_06: "The band and the crowd hold up the flag bearing the coat of arms and motto of Minas Gerais on stage",
      gal_cap_07: "Live",
      gal_alt_07: "Adriano Avelar and Marcelo Loss performing under colorful stage lights",
      gal_cap_08: "After the show",
      gal_alt_08: "Loss with the crowd after the show",
      gal_cap_09: "Ireland",
      gal_alt_09: "Marcelo Loss, Teddy Bronsk and Adriano Avelar sitting on the steps of a church in Ireland",
      gal_cap_10: "Cart &amp; Horses, London",
      gal_alt_10: "The band in front of Cart & Horses, the London pub where Iron Maiden played their earliest shows",
      gal_cap_11: "Festival",
      gal_alt_11: "Loss performing at an open-air festival at night",
      gal_cap_12: "Paris, France",
      gal_alt_12: "Marcelo Loss, Adriano Avelar and Teddy Bronsk in front of the Eiffel Tower in Paris",
      gal_cap_13: "Crowd",
      gal_alt_13: "The crowd headbanging during a Loss performance",
      gal_cap_14: "Live",
      gal_alt_14: "Adriano Avelar playing guitar on a stage with colorful stained glass in the background",
      gal_cap_15: "On stage",
      gal_alt_15: "Loss posing on stage with the crowd behind them, in a festive mood"
    }
  };

  function getStoredLanguage() {
    try {
      var saved = localStorage.getItem(STORAGE_KEY);
      if (saved === "pt" || saved === "en") return saved;
    } catch (e) {}
    return "pt";
  }

  function applyLanguage(lang) {
    if (lang !== "pt" && lang !== "en") lang = "pt";
    var dict = I18N[lang];

    document.documentElement.setAttribute("lang", lang === "en" ? "en" : "pt-BR");

    document.querySelectorAll("[data-i18n]").forEach(function (el) {
      var key = el.getAttribute("data-i18n");
      if (dict[key] !== undefined) el.innerHTML = dict[key];
    });
    document.querySelectorAll("[data-i18n-alt]").forEach(function (el) {
      var key = el.getAttribute("data-i18n-alt");
      if (dict[key] !== undefined) el.setAttribute("alt", dict[key]);
    });
    document.querySelectorAll("[data-i18n-aria-label]").forEach(function (el) {
      var key = el.getAttribute("data-i18n-aria-label");
      if (dict[key] !== undefined) el.setAttribute("aria-label", dict[key]);
    });
    document.querySelectorAll("[data-i18n-content]").forEach(function (el) {
      var key = el.getAttribute("data-i18n-content");
      if (dict[key] !== undefined) el.setAttribute("content", dict[key]);
    });

    document.querySelectorAll(".lang-btn").forEach(function (btn) {
      var isActive = btn.getAttribute("data-lang") === lang;
      btn.classList.toggle("is-active", isActive);
      btn.setAttribute("aria-pressed", isActive ? "true" : "false");
    });

    window.LOSS_LANG = lang;
    try { localStorage.setItem(STORAGE_KEY, lang); } catch (e) {}
  }

  document.addEventListener("DOMContentLoaded", function () {
    document.querySelectorAll(".lang-btn").forEach(function (btn) {
      btn.addEventListener("click", function () {
        applyLanguage(btn.getAttribute("data-lang"));
      });
    });
    applyLanguage(getStoredLanguage());
  });

  window.LOSS_I18N = I18N;
  window.lossApplyLanguage = applyLanguage;
})();

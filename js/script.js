document.addEventListener("DOMContentLoaded", function () {

  // ano dinâmico no rodapé
  var yearEl = document.getElementById("year");
  if (yearEl) yearEl.textContent = new Date().getFullYear();

  // menu mobile
  var navToggle = document.getElementById("navToggle");
  var primaryNav = document.getElementById("primaryNav");
  if (navToggle && primaryNav) {
    navToggle.addEventListener("click", function () {
      var isOpen = primaryNav.classList.toggle("open");
      navToggle.setAttribute("aria-expanded", isOpen ? "true" : "false");
    });
    primaryNav.querySelectorAll("a").forEach(function (link) {
      link.addEventListener("click", function () {
        primaryNav.classList.remove("open");
        navToggle.setAttribute("aria-expanded", "false");
      });
    });
  }

  // aviso da loja: sem backend ainda, então abrimos o e-mail do cliente
  // com o endereço já preenchido para a banda receber o interesse.
  var lojaForm = document.getElementById("lojaForm");
  var lojaNote = document.getElementById("lojaNote");
  if (lojaForm) {
    lojaForm.addEventListener("submit", function (e) {
      e.preventDefault();
      var email = document.getElementById("lojaEmail").value.trim();
      if (!email) return;
      var subject = encodeURIComponent("Avise-me quando a loja da Loss abrir");
      var body = encodeURIComponent("Quero ser avisado(a) quando a loja de merchandising da Loss abrir.\n\nMeu e-mail: " + email);
      window.location.href = "mailto:loss.band@yahoo.com?subject=" + subject + "&body=" + body;
      lojaNote.textContent = "Abrindo seu app de e-mail para confirmar o envio…";
      lojaForm.reset();
    });
  }

  // formulário de contato: mesma lógica, via mailto (site 100% estático)
  var contatoForm = document.getElementById("contatoForm");
  var contatoNote = document.getElementById("contatoNote");
  if (contatoForm) {
    contatoForm.addEventListener("submit", function (e) {
      e.preventDefault();
      var nome = document.getElementById("nome").value.trim();
      var email = document.getElementById("email").value.trim();
      var mensagem = document.getElementById("mensagem").value.trim();
      if (!nome || !email || !mensagem) return;

      var subject = encodeURIComponent("Contato pelo site — " + nome);
      var body = encodeURIComponent(mensagem + "\n\n— " + nome + " (" + email + ")");
      window.location.href = "mailto:loss.band@yahoo.com?subject=" + subject + "&body=" + body;
      contatoNote.textContent = "Abrindo seu app de e-mail para confirmar o envio…";
      contatoForm.reset();
    });
  }

});

document.addEventListener("DOMContentLoaded", () => {
    const dropdown = document.getElementById("dropdownDocumento");
    const btn = document.getElementById("dropdownBtn");
    const texto = document.getElementById("documentoSelecionado");
    const inputHidden = document.getElementById("tipo_documento");

    const campoNumero = document.getElementById("campoNumeroDocumento");
    const inputNumero = document.getElementById("numero_documento");

    btn.addEventListener("click", (e) => {
        e.stopPropagation();
        dropdown.classList.toggle("active");
    });

    document.querySelectorAll(".dropdown-item").forEach(item => {
        item.addEventListener("click", () => {
            const documento = item.dataset.value.toUpperCase();
            texto.textContent = item.textContent;
            inputHidden.value = item.dataset.value;
            campoNumero.style.display = "flex";
            inputNumero.placeholder = `Digite sua ${documento}:`;
            dropdown.classList.remove("active");
        });

    });

    document.addEventListener("click", (e) => {
        if (!dropdown.contains(e.target)) {
            dropdown.classList.remove("active");
        }
    });

});
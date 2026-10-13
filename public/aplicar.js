/* ============ APLICAR / ANAMNESE — Logic ============ */
(function(){

  // ============ CONFIG ============
  // Substitua estes valores pelos contatos reais do dono do site
  const OWNER_EMAIL = 'contato@forge.com.br';
  const OWNER_WHATSAPP = '5511900000000'; // formato internacional sem +

  // ============ STATE ============
  const steps = document.querySelectorAll('.apl-step');
  const totalSteps = steps.length;
  let currentStep = 1;

  const prevBtn = document.getElementById('prevBtn');
  const nextBtn = document.getElementById('nextBtn');
  const submitBtn = document.getElementById('submitBtn');
  const progressBar = document.getElementById('progressBar');
  const stepCurrentEl = document.getElementById('stepCurrent');
  const stepNameEl = document.getElementById('stepName');
  const form = document.getElementById('anamneseForm');
  const successModal = document.getElementById('successModal');
  const whatsappBtn = document.getElementById('whatsappBtn');

  // ============ NAVIGATION ============
  function showStep(n) {
    steps.forEach(s => s.classList.remove('active'));
    const target = document.querySelector(`.apl-step[data-step="${n}"]`);
    if (!target) return;
    target.classList.add('active');

    // Progress
    const pct = (n / totalSteps) * 100;
    progressBar.style.right = `${100 - pct}%`;
    stepCurrentEl.textContent = String(n).padStart(2, '0');
    stepNameEl.textContent = target.dataset.name || '';

    // Buttons
    prevBtn.disabled = n === 1;
    if (n === totalSteps) {
      nextBtn.style.display = 'none';
      submitBtn.style.display = 'inline-flex';
    } else {
      nextBtn.style.display = 'inline-flex';
      submitBtn.style.display = 'none';
    }

    // Scroll to top
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  function validateStep(n) {
    const target = document.querySelector(`.apl-step[data-step="${n}"]`);
    const required = target.querySelectorAll('[required]');
    let valid = true;
    let firstInvalid = null;
    required.forEach(el => {
      const field = el.closest('.apl-field');
      if (!el.value || (el.type === 'checkbox' && !el.checked) || (el.type === 'radio' && !target.querySelector(`[name="${el.name}"]:checked`))) {
        if (field) field.classList.add('error');
        valid = false;
        if (!firstInvalid) firstInvalid = el;
      } else {
        if (field) field.classList.remove('error');
      }
    });
    if (!valid && firstInvalid) {
      firstInvalid.focus();
    }
    return valid;
  }

  prevBtn.addEventListener('click', () => {
    if (currentStep > 1) {
      currentStep--;
      showStep(currentStep);
    }
  });

  nextBtn.addEventListener('click', () => {
    if (validateStep(currentStep)) {
      if (currentStep < totalSteps) {
        currentStep++;
        showStep(currentStep);
      }
    }
  });

  // Clear error on input
  form.addEventListener('input', (e) => {
    const field = e.target.closest('.apl-field');
    if (field) field.classList.remove('error');
  });

  // ============ SUBMIT ============
  form.addEventListener('submit', (e) => {
    e.preventDefault();
    if (!validateStep(currentStep)) return;

    const data = collectFormData();
    const message = formatMessage(data);

    // 1. Abre WhatsApp em nova aba (mensagem pronta)
    const wppUrl = `https://wa.me/${OWNER_WHATSAPP}?text=${encodeURIComponent(message)}`;
    const wppWin = window.open(wppUrl, '_blank');

    // 2. Envia email via mailto (fallback para o cliente de email do usuário)
    const subject = `[FORGE] Nova aplicação — ${data.nome || 'Sem nome'}`;
    const mailtoUrl = `mailto:${OWNER_EMAIL}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(message)}`;
    // Pequeno delay pra não cancelar o popup do WhatsApp
    setTimeout(() => {
      // Apenas dispara se o usuário tiver cliente de email configurado
      const link = document.createElement('a');
      link.href = mailtoUrl;
      link.style.display = 'none';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    }, 500);

    // 3. Mostra modal de sucesso
    successModal.style.display = 'grid';
    if (whatsappBtn) {
      whatsappBtn.href = wppUrl;
    }

    // 4. Salva localmente como backup
    try {
      const backup = {
        timestamp: new Date().toISOString(),
        data: data
      };
      localStorage.setItem('forge_aplicacao_' + Date.now(), JSON.stringify(backup));
    } catch(err) { console.warn('Backup local falhou', err); }
  });

  function collectFormData() {
    const formData = new FormData(form);
    const data = {};
    for (const [key, value] of formData.entries()) {
      data[key] = value;
    }
    return data;
  }

  function formatMessage(d) {
    const lines = [];
    lines.push('━━━━━━━━━━━━━━━━━━━━━━');
    lines.push('🔥 FORGE — NOVA APLICAÇÃO');
    lines.push('━━━━━━━━━━━━━━━━━━━━━━');
    lines.push('');
    lines.push('▸ IDENTIFICAÇÃO');
    lines.push(`Nome: ${d.nome || '—'}`);
    lines.push(`Nascimento: ${d.nascimento || '—'}`);
    lines.push(`Email: ${d.email || '—'}`);
    lines.push(`WhatsApp: ${d.whatsapp || '—'}`);
    lines.push(`Cidade: ${d.cidade || '—'}`);
    lines.push(`Profissão: ${d.profissao || '—'}`);
    lines.push(`Sexo: ${d.sexo || '—'}`);
    lines.push(`Estado civil: ${d.estado_civil || '—'}`);
    lines.push('');
    lines.push('▸ ANTROPOMETRIA');
    lines.push(`Altura: ${d.altura || '—'} cm`);
    lines.push(`Peso: ${d.peso || '—'} kg`);
    lines.push(`% Gordura: ${d.bf || '—'}`);
    lines.push(`Cintura: ${d.cintura || '—'} cm`);
    lines.push(`Peso alvo: ${d.peso_alvo || '—'} kg`);
    lines.push(`Exame corporal: ${d.exame_corporal || '—'}`);
    lines.push('');
    lines.push('▸ TREINO');
    lines.push(`Tempo: ${d.tempo_treino || '—'}`);
    lines.push(`Frequência: ${d.freq_semanal || '—'}`);
    lines.push(`Duração: ${d.tempo_sessao || '—'}`);
    lines.push(`Local: ${d.local_treino || '—'}`);
    lines.push(`Personal: ${d.personal || '—'}`);
    lines.push(`PRs: ${d.prs || '—'}`);
    lines.push(`Esportes: ${d.esportes || '—'}`);
    lines.push('');
    lines.push('▸ DIETA');
    lines.push(`Já fez dieta: ${d.ja_dieta || '—'}`);
    lines.push(`Refeições/dia: ${d.refeicoes || '—'}`);
    lines.push(`Restrições: ${d.restricoes || '—'}`);
    lines.push(`Suplementação: ${d.suplementacao || '—'}`);
    lines.push(`Álcool: ${d.alcool || '—'}`);
    lines.push(`Água: ${d.agua || '—'}`);
    lines.push('');
    lines.push('▸ SAÚDE');
    lines.push(`Patologias: ${d.patologias || '—'}`);
    lines.push(`Medicamentos: ${d.medicamentos || '—'}`);
    lines.push(`Lesões: ${d.lesoes || '—'}`);
    lines.push(`Sono: ${d.sono || '—'}`);
    lines.push(`Estresse (1-10): ${d.estresse || '—'}`);
    lines.push(`Fuma: ${d.fuma || '—'}`);
    lines.push(`Anabolizantes/TRT: ${d.ergogenicos || '—'}`);
    lines.push(`Exames recentes: ${d.exames_recentes || '—'}`);
    lines.push('');
    lines.push('▸ OBJETIVO');
    lines.push(`Objetivo: ${d.objetivo || '—'}`);
    lines.push(`Prazo: ${d.prazo || '—'}`);
    lines.push(`Plano: ${d.plano || 'Sugestão da equipe'}`);
    lines.push(`Origem: ${d.origem || '—'}`);
    lines.push(`Motivação: ${d.motivacao || '—'}`);
    lines.push(`Compromisso: ${d.compromisso ? '✓ Aceito' : '—'}`);
    lines.push('');
    lines.push('━━━━━━━━━━━━━━━━━━━━━━');
    lines.push(`Enviado em: ${new Date().toLocaleString('pt-BR')}`);
    return lines.join('\n');
  }

  // Init
  showStep(1);
})();

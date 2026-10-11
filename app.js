/**
 * 形式风格知识库 / Form Style Knowledge
 * app.js —— 数据加载、渲染、交互
 */
(function () {
  'use strict';

  // ============================================
  // 内部状态
  // ============================================
  const state = {
    styles: [],
    works: [],
    activeTag: 'all',
    activeStyle: 'all',
    activeType: 'all',
    searchQuery: '',
  };

  // ============================================
  // 工具函数
  // ============================================
  const $ = (sel, parent = document) => parent.querySelector(sel);
  const $$ = (sel, parent = document) => Array.from(parent.querySelectorAll(sel));

  async function fetchJSON(url) {
    const res = await fetch(url);
    if (!res.ok) throw new Error('加载失败: ' + url);
    return res.json();
  }

  function escapeHTML(str) {
    if (str == null) return '';
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }

  // ============================================
  // A. 数据加载
  // ============================================
  async function loadData() {
    try {
      // 优先使用内嵌数据（支持直接双击 index.html 打开），否则回退到 fetch
      let stylesData, worksData;
      if (window.EMBEDDED_STYLES && window.EMBEDDED_WORKS) {
        stylesData = window.EMBEDDED_STYLES;
        worksData = window.EMBEDDED_WORKS;
      } else {
        [stylesData, worksData] = await Promise.all([
          fetchJSON('data/styles.json'),
          fetchJSON('data/works.json'),
        ]);
      }
      state.styles = stylesData.styles;
      state.works = worksData.works;
      
      renderStyleFilters();
      renderWorkFilters();
      renderStyles();
      renderWorks();
      bindAllEvents();
    } catch (err) {
      console.error(err);
      showError(err.message);
    }
  }

  function showError(msg) {
    const container = $('#styles-grid');
    if (container) {
      container.innerHTML = `
        <div class="empty-state" style="grid-column: 1/-1;">
          <p style="color: #C97B4A;">数据加载失败</p>
          <p style="margin-top: 0.5rem;">${escapeHTML(msg)}</p>
          <p style="margin-top: 1rem; font-size: 0.8rem;">请通过本地服务器（如 Live Server）打开页面，直接双击打开 HTML 文件会导致 fetch 被浏览器限制。</p>
        </div>
      `;
    }
  }

  // ============================================
  // B. 风格区：渲染 & 筛选
  // ============================================
  function renderStyleFilters() {
    const bar = $('#styles-filter-bar');
    if (!bar) return;

    // 收集所有唯一标签
    const allTags = new Set();
    state.styles.forEach(s => (s.tags || []).forEach(t => allTags.add(t)));

    // 生成筛选按钮
    const buttons = Array.from(allTags).map(tag => `
      <button class="filter-chip" data-tag="${escapeHTML(tag)}">${escapeHTML(tag)}</button>
    `).join('');

    bar.innerHTML = `
      <span class="filter-label">标签筛选：</span>
      <button class="filter-chip active" data-tag="all">全部</button>
      ${buttons}
    `;

    // 绑定筛选事件
    $$('.filter-chip', bar).forEach(btn => {
      btn.addEventListener('click', () => {
        $$('.filter-chip', bar).forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        state.activeTag = btn.dataset.tag;
        renderStyles();
      });
    });
  }

  function getFilteredStyles() {
    let result = state.styles.slice();

    // 标签筛选
    if (state.activeTag !== 'all') {
      result = result.filter(s => (s.tags || []).includes(state.activeTag));
    }

    // 搜索筛选
    if (state.searchQuery) {
      const q = state.searchQuery.toLowerCase();
      result = result.filter(s =>
        s.name.toLowerCase().includes(q) ||
        s.name_en.toLowerCase().includes(q) ||
        s.desc.toLowerCase().includes(q) ||
        (s.tags || []).some(t => t.toLowerCase().includes(q))
      );
    }

    return result;
  }

  function renderStyles() {
    const grid = $('#styles-grid');
    if (!grid) return;

    const styles = getFilteredStyles();

    if (styles.length === 0) {
      grid.innerHTML = `<div class="empty-state" style="grid-column: 1/-1;">
        <p>没有找到匹配的风格</p>
      </div>`;
      return;
    }

    grid.innerHTML = styles.map(s => `
      <div class="style-card" data-style-id="${escapeHTML(s.id)}">
        <div class="style-card-era">${escapeHTML(s.era)}</div>
        <h3 class="style-card-name">${escapeHTML(s.name)}<br><span style="font-weight: 400; font-size: 0.8em; color: var(--text-muted);">${escapeHTML(s.name_en)}</span></h3>
        <p class="style-card-desc">${escapeHTML(s.desc)}</p>
        <div class="style-card-tags">
          ${(s.tags || []).map(t => `<span class="style-tag">${escapeHTML(t)}</span>`).join('')}
        </div>
      </div>
    `).join('');

    // 绑定点击事件
    $$('.style-card', grid).forEach(card => {
      card.addEventListener('click', () => openStyleModal(card.dataset.styleId));
    });
  }

  // ============================================
  // C. 作品区：渲染 & 筛选
  // ============================================
  function renderWorkFilters() {
    const bar = $('#works-filter-bar');
    if (!bar) return;

    // 收集所有唯一的作品类型
    const allTypes = [...new Set(state.works.map(w => w.type))].filter(Boolean).sort();

    // 风格按钮
    const styleBtns = state.styles.map(s =>
      `<button class="filter-chip" data-style="${escapeHTML(s.id)}">${escapeHTML(s.name)}</button>`
    ).join('');

    // 类型按钮（重点突出跨领域：动画、游戏、电影、交互）
    const typeBtns = allTypes.map(t => {
      const isCrossDomain = ['动画', '游戏', '电影', '界面设计', '交互设计', '交互装置', '数字艺术', '空间改造', '空间装置', '空间设计'].includes(t);
      return `<button class="filter-chip${isCrossDomain ? ' filter-chip-highlight' : ''}" data-type="${escapeHTML(t)}">${escapeHTML(t)}</button>`;
    }).join('');

    bar.innerHTML = `
      <div class="filter-row" data-group="style">
        <span class="filter-label">按风格：</span>
        <button class="filter-chip active" data-style="all">全部</button>
        ${styleBtns}
      </div>
      <div class="filter-row" data-group="type" style="margin-top:0.75rem">
        <span class="filter-label">按类型：</span>
        <button class="filter-chip active" data-type="all">全部</button>
        ${typeBtns}
      </div>
    `;

    // 风格筛选事件
    $$('[data-group="style"] .filter-chip', bar).forEach(btn => {
      btn.addEventListener('click', () => {
        $$('[data-group="style"] .filter-chip', bar).forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        state.activeStyle = btn.dataset.style;
        renderWorks();
      });
    });

    // 类型筛选事件
    $$('[data-group="type"] .filter-chip', bar).forEach(btn => {
      btn.addEventListener('click', () => {
        $$('[data-group="type"] .filter-chip', bar).forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        state.activeType = btn.dataset.type;
        renderWorks();
      });
    });
  }

  function getFilteredWorks() {
    let result = state.works.slice();

    // 风格筛选
    if (state.activeStyle !== 'all') {
      result = result.filter(w => w.style_id === state.activeStyle);
    }

    // 类型筛选（动画/游戏/电影/交互...）
    if (state.activeType !== 'all') {
      result = result.filter(w => w.type === state.activeType);
    }

    // 搜索筛选
    if (state.searchQuery) {
      const q = state.searchQuery.toLowerCase();
      result = result.filter(w =>
        w.title.toLowerCase().includes(q) ||
        w.artist.toLowerCase().includes(q) ||
        w.desc.toLowerCase().includes(q) ||
        w.type.toLowerCase().includes(q) ||
        getStyleById(w.style_id)?.name.toLowerCase().includes(q)
      );
    }

    return result;
  }

  function getStyleById(id) {
    return state.styles.find(s => s.id === id);
  }

  function renderWorks() {
    const grid = $('#works-grid');
    if (!grid) return;

    const works = getFilteredWorks();

    if (works.length === 0) {
      grid.innerHTML = `<div class="empty-state" style="grid-column: 1/-1;">
        <p>没有找到匹配的作品</p>
      </div>`;
      return;
    }

    grid.innerHTML = works.map(w => {
      const style = getStyleById(w.style_id);
      const imgPath = `images/${w.id}.jpg`;
      const initialChar = w.title.charAt(0);
      return `
        <div class="work-card" data-work-id="${escapeHTML(w.id)}">
          <div class="work-card-image">
            <img src="${imgPath}" alt="${escapeHTML(w.title)}" 
                 loading="lazy" decoding="async"
                 style="width: 100%; height: 100%; object-fit: cover; transition: transform 0.3s ease;"
                 onerror="this.style.display='none'; this.nextElementSibling.style.display='inline';"/>
            <span class="work-card-image-placeholder" style="display:none;">${escapeHTML(initialChar)}</span>
            ${style ? `<span style="position: absolute; top: 12px; right: 12px; font-size: 0.7rem; background: rgba(44,44,44,0.7); color: #FAF7F2; padding: 3px 10px; border-radius: 10px; font-weight: 500;">${escapeHTML(style.name)}</span>` : ''}
          </div>
          <div class="work-card-body">
            <div class="work-card-title">${escapeHTML(w.title)}</div>
            <div class="work-card-artist">${escapeHTML(w.artist)} · ${escapeHTML(w.year)}</div>
          </div>
        </div>
      `;
    }).join('');

    // 绑定点击事件
    $$('.work-card', grid).forEach(card => {
      card.addEventListener('click', () => openWorkModal(card.dataset.workId));
    });
  }

  // ============================================
  // D. 弹窗：风格详情 & 作品详情
  // ============================================
  function openStyleModal(id) {
    const style = getStyleById(id);
    if (!style) return;

    const body = $('#modal-body');
    body.innerHTML = `
      <div style="margin-bottom: 0.5rem; font-size: 0.75rem; font-weight: 500; letter-spacing: 0.1em; color: var(--accent-primary); text-transform: uppercase;">
        ${escapeHTML(style.era)}
      </div>
      <h2 style="margin-bottom: 0.5rem;">${escapeHTML(style.name)}</h2>
      <div style="font-size: 0.9rem; color: var(--text-muted); margin-bottom: 1.5rem;">${escapeHTML(style.name_en)}</div>

      <div class="modal-section">
        <h4>风格简介</h4>
        <p>${escapeHTML(style.desc)}</p>
      </div>

      <div class="modal-section">
        <h4>主要视觉特征</h4>
        <ul style="padding-left: 1.25rem; color: var(--text-secondary); font-size: 0.95rem; line-height: 1.8;">
          ${(style.features || []).map(f => `<li>${escapeHTML(f)}</li>`).join('')}
        </ul>
      </div>

      <div class="modal-section">
        <h4>识别依据</h4>
        <p>${escapeHTML(style.recognition)}</p>
      </div>

      <div class="modal-section">
        <h4>关联标签</h4>
        <div style="display: flex; flex-wrap: wrap; gap: 6px;">
          ${(style.tags || []).map(t => `<span class="style-tag">${escapeHTML(t)}</span>`).join('')}
        </div>
      </div>
    `;

    showModal();
  }

  function openWorkModal(id) {
    const work = state.works.find(w => w.id === id);
    if (!work) return;

    const style = getStyleById(work.style_id);

    const body = $('#modal-body');
    body.innerHTML = `
      ${style ? `<div style="margin-bottom: 0.5rem; font-size: 0.75rem; font-weight: 500; letter-spacing: 0.1em; color: var(--accent-primary); text-transform: uppercase;">${escapeHTML(style.name)} · ${escapeHTML(work.type)}</div>` : ''}
      <h2 style="margin-bottom: 0.5rem;">${escapeHTML(work.title)}</h2>
      <div style="font-size: 0.9rem; color: var(--text-muted); margin-bottom: 1.5rem;">
        ${escapeHTML(work.artist)} · ${escapeHTML(work.year)}
      </div>

      <div class="modal-section">
        <h4>作品说明</h4>
        <p>${escapeHTML(work.desc)}</p>
      </div>

      ${work.source ? `
        <div class="modal-section">
          <h4>来源</h4>
          <p>${escapeHTML(work.source)}</p>
        </div>
      ` : ''}
    `;

    showModal();
  }

  function showModal() {
    const overlay = $('#modal-overlay');
    overlay.classList.add('active');
    document.body.style.overflow = 'hidden';
  }

  function hideModal() {
    const overlay = $('#modal-overlay');
    overlay.classList.remove('active');
    document.body.style.overflow = '';
    $('#modal-body').innerHTML = '';
  }

  // ============================================
  // E. 全局事件绑定
  // ============================================
  function bindAllEvents() {
    // 关闭弹窗
    $('#modal-close').addEventListener('click', hideModal);
    $('#modal-overlay').addEventListener('click', (e) => {
      if (e.target.id === 'modal-overlay') hideModal();
    });
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') hideModal();
    });

    // 导航栏搜索
    const searchInput = $('#nav-search-input');
    if (searchInput) {
      let debounceTimer;
      searchInput.addEventListener('input', (e) => {
        clearTimeout(debounceTimer);
        debounceTimer = setTimeout(() => {
          state.searchQuery = e.target.value.trim();
          renderStyles();
          renderWorks();
        }, 200);
      });

      // 清空搜索
      searchInput.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') {
          searchInput.value = '';
          state.searchQuery = '';
          renderStyles();
          renderWorks();
        }
      });
    }

    // 移动端菜单按钮（预留）
    const mobileBtn = $('#mobile-menu-btn');
    if (mobileBtn) {
      mobileBtn.addEventListener('click', () => {
        // 简约起见，暂时只做简单的 alert
        alert('移动端菜单（预留功能）。请在桌面端查看完整内容。');
      });
    }

    // 导航链接点击高亮
    $$('.nav-links a').forEach(link => {
      link.addEventListener('click', () => {
        $$('.nav-links a').forEach(l => l.classList.remove('active'));
        link.classList.add('active');
      });
    });
  }

  // ============================================
  // 启动
  // ============================================
  document.addEventListener('DOMContentLoaded', loadData);

})();

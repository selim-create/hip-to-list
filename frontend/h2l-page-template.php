<?php
/**
 * Template Name: Hip to List App Template
 */
get_header(); 
?>

<!-- Uygulamanın etrafındaki temiz kapsayıcı -->
<div id="h2l-page-wrapper">
    <div id="h2l-frontend-app">
        <div class="h2l-loading">
            <i class="fa-solid fa-circle-notch fa-spin"></i> Yükleniyor...
        </div>
    </div>
</div>

<!-- Temayı baskılayan stiller -->
<style>
    /* Astra ve diğer temalar için zorunlu resetler */
    .ast-container, .site-content, #content, .content-area, .site-main, .entry-content {
        max-width: 100% !important;
        width: 100% !important;
        padding: 0 !important;
        margin: 0 !important;
        display: block !important;
        background: transparent !important; /* Arka plan rengini h2l-page-wrapper yönetir */
    }
    
    /* Başlıkları ve yan panelleri gizle */
    .entry-header, .entry-title, .ast-breadcrumb, #secondary, .widget-area {
        display: none !important;
    }
    
    /* Sayfa arka planını gri yap (App hissi için) */
    body {
        background-color: #f4f5f7 !important;
    }
</style>

<?php 
get_footer(); 
?>
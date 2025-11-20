<?php
/**
 * Template Name: Hip to List App Template
 */
get_header(); 
?>

<!-- 
    Astra ve diğer temalar için zorunlu stil ezmeleri.
    Bu CSS bloğu sadece bu sayfada çalışır.
-->
<style>
    /* Temanın default container yapılarını iptal et */
    .ast-container, .site-content, #content, .content-area, .site-main {
        display: block !important;
        width: 100% !important;
        max-width: 100% !important;
        padding: 0 !important;
        margin: 0 !important;
        float: none !important;
    }
    /* Yan paneli gizle */
    #secondary, .widget-area { display: none !important; }
    
    /* Uygulama Wrapper */
    #h2l-fullscreen-wrapper {
        width: 100vw;
        max-width: 100%;
        background: #fff;
        min-height: 85vh;
        position: relative;
        z-index: 1;
        display: block;
        padding-top: 20px;
        padding-bottom: 20px;
    }
</style>

<div id="h2l-fullscreen-wrapper">
    <div id="h2l-frontend-app">
        <div class="h2l-loading">
            <i class="fa-solid fa-circle-notch fa-spin"></i> Yükleniyor...
        </div>
    </div>
</div>

<?php 
get_footer(); 
?>
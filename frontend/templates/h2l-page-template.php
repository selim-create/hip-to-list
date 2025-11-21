<?php
/**
 * Template Name: Hip to List Canvas
 * Description: Header ve Footer korunur, içerik alanı tamamen sıfırlanır.
 */

get_header(); 
?>

<!-- 
    TEMA SIFIRLAMA (CSS RESET) 
    Bu stil bloğu, temanın içerik alanına verdiği padding/margin değerlerini ezer.
-->
<style>
    /* 1. Temanın ana kapsayıcılarını tam genişlik yap */
    .ast-container, 
    .site-content, 
    #content, 
    .content-area, 
    .site-main,
    .entry-content {
        max-width: 100% !important;
        width: 100% !important;
        padding: 0 !important;
        margin: 0 !important;
        display: block !important;
        float: none !important;
    }

    /* 2. Sayfa Başlıklarını Gizle */
    .entry-header, 
    .entry-title, 
    .ast-breadcrumb, 
    .ast-archive-description,
    h1.entry-title {
        display: none !important;
    }

    /* 3. Arka Planı Temizle */
    body, .site-content {
        background-color: #fff !important; 
        overflow-x: hidden; /* Yatay kaydırmayı engelle */
    }
</style>

<!-- UYGULAMA KÖKÜ -->
<div id="h2l-app-root">
    <div id="h2l-frontend-app">
        <div class="h2l-loading">
            <i class="fa-solid fa-circle-notch fa-spin"></i> Yükleniyor...
        </div>
    </div>
</div>

<?php 
get_footer(); 
?>
<?php
/**
 * CRM Entegrasyonu: Post Edit Ekranı Metabox'ı
 */

if ( ! defined( 'ABSPATH' ) ) {
    exit;
}

class H2L_CRM_Metabox {

    public function __construct() {
        add_action( 'add_meta_boxes', array( $this, 'register_meta_boxes' ) );
        add_action( 'admin_enqueue_scripts', array( $this, 'enqueue_assets' ) );
    }

    public function register_meta_boxes() {
        // Kutunun görüneceği post type'lar. Projenize göre burayı düzenleyebilirsiniz.
        $screens = [ 'post', 'page', 'kampanya', 'ajans', 'reklamveren', 'yayinci', 'mecra' ]; 
        
        foreach ( $screens as $screen ) {
            add_meta_box(
                'h2l_related_tasks',
                '<span style="color:#db4c3f; font-weight:bold;">İlişkili Görevler</span>',
                array( $this, 'render_metabox' ),
                $screen,
                'side', // 'side' (sağ sütun) veya 'normal' (orta sütun)
                'high'
            );
        }
    }

    public function render_metabox( $post ) {
        ?>
        <div id="h2l-crm-metabox-root" 
             data-post-id="<?php echo esc_attr( $post->ID ); ?>" 
             data-post-type="<?php echo esc_attr( $post->post_type ); ?>"
             data-post-title="<?php echo esc_attr( $post->post_title ); ?>">
            <div style="padding:20px; text-align:center; color:#999;">
                <span class="spinner is-active" style="float:none; margin:0;"></span> Yükleniyor...
            </div>
        </div>
        <?php
    }
    public function enqueue_assets( $hook ) {
        global $post, $wpdb;

        if ( ! in_array( $hook, array( 'post.php', 'post-new.php' ) ) ) {
            return;
        }

        $deps = array( 'wp-element', 'wp-api-fetch', 'wp-components', 'wp-i18n' );
        
        wp_enqueue_style('font-awesome', 'https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css', array(), '6.4.0');
        wp_enqueue_style('h2l-common-css', H2L_URL.'frontend/assets/css/h2l-common.css', array(), H2L_VERSION);
        wp_enqueue_style('h2l-tasks-css', H2L_URL.'frontend/assets/css/h2l-tasks.css', array('h2l-common-css'), H2L_VERSION);

        wp_enqueue_script(
            'h2l-metabox-js', 
            H2L_URL . 'admin/assets/h2l-metabox.js', 
            $deps, 
            time(), 
            true 
        );

        $cu = wp_get_current_user();
        
        // DÜZELTME: 
        // 1. Sadece kullanıcının yetkili olduğu projeleri çek (Sahibi veya Yöneticisi)
        // 2. 'inbox-project' (Notlarım) projesini listeden çıkar (Zaten Gelen Kutusu seçeneği var)
        $uid_str = '"' . $cu->ID . '"';
        
        $sql = "SELECT id, title FROM {$wpdb->prefix}h2l_projects 
                WHERE status != 'trash' 
                AND slug != 'inbox-project' 
                AND ( 
                    owner_id = %d 
                    OR managers LIKE %s 
                )
                ORDER BY title ASC";
        
        $projects = $wpdb->get_results($wpdb->prepare($sql, $cu->ID, '%' . $wpdb->esc_like($uid_str) . '%'));

        wp_localize_script( 'h2l-metabox-js', 'h2lMetaboxSettings', array(
            'root'  => esc_url_raw( rest_url() ),
            'nonce' => wp_create_nonce( 'wp_rest' ),
            'currentUser' => array( 'id' => $cu->ID, 'name' => $cu->display_name ),
            'projects' => $projects
        ));
    }
}

new H2L_CRM_Metabox();
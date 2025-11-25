<?php
/**
 * Hip to List - Admin Sayfaları
 * GÜNCELLEME: Ayarlar sayfasına "API & Toplantı" sekmesi eklendi.
 */

if ( ! defined( 'ABSPATH' ) ) {
    exit;
}

function h2l_ensure_system_integrity() {
    global $wpdb;
    $table_sections = $wpdb->prefix . 'h2l_sections';
    $table_exists = $wpdb->get_var("SHOW TABLES LIKE '$table_sections'") == $table_sections;
    $column_exists = false;
    if ($table_exists) {
        $columns = $wpdb->get_results("SHOW COLUMNS FROM $table_sections LIKE 'name'");
        $column_exists = !empty($columns);
    }
    $page_exists = false;
    $slug = 'gorevler';
    $query = new WP_Query( array( 'post_type' => 'page', 'name' => $slug, 'posts_per_page' => 1 ));
    if ( $query->have_posts() ) { $page_exists = true; }
    wp_reset_postdata();
    
    if ( ! $table_exists || ! $column_exists || ! $page_exists ) {
        if(file_exists(H2L_PATH . 'includes/install.php')) {
            require_once H2L_PATH . 'includes/install.php';
            h2l_install_db();
        }
    }
}
add_action('admin_init', 'h2l_ensure_system_integrity');

add_action( 'admin_menu', 'h2l_register_admin_menu' );
function h2l_register_admin_menu() {
    add_menu_page( 'Hip to List', 'Hip to List', 'read', 'h2l-tasks', 'h2l_render_tasks_page', 'dashicons-yes-alt', 6 );
    add_submenu_page( 'h2l-tasks', 'Görevler', 'Görevler', 'read', 'h2l-tasks', 'h2l_render_tasks_page' );
    add_submenu_page( 'h2l-tasks', 'Görev Ekle', 'Görev Ekle', 'publish_posts', 'h2l-task-edit', 'h2l_render_task_edit_page' );
    add_submenu_page( 'h2l-tasks', 'Projeler', 'Projeler', 'read', 'h2l-projects', 'h2l_render_projects_page' );
    add_submenu_page( 'h2l-tasks', 'Proje Ekle', 'Proje Ekle', 'publish_posts', 'h2l-project-edit', 'h2l_render_project_edit_page' );
    add_submenu_page( 'h2l-tasks', 'Klasörler', 'Klasörler', 'read', 'h2l-folders', 'h2l_render_folders_page' );
    add_submenu_page( 'h2l-tasks', 'Etiketler', 'Etiketler', 'read', 'h2l-labels', 'h2l_render_labels_page' );
    add_submenu_page( 'h2l-tasks', 'Ayarlar', 'Ayarlar', 'manage_options', 'h2l-settings', 'h2l_render_settings_page' );
}

add_action('admin_enqueue_scripts', 'h2l_admin_scripts');
function h2l_admin_scripts($hook) {
    if(strpos($hook, 'h2l') === false) return;
    wp_enqueue_script('jquery-ui-datepicker');
    wp_enqueue_style('jquery-ui-css', 'https://ajax.googleapis.com/ajax/libs/jqueryui/1.12.1/themes/smoothness/jquery-ui.css');
    wp_enqueue_style('flatpickr-css', 'https://cdn.jsdelivr.net/npm/flatpickr/dist/flatpickr.min.css');
    wp_enqueue_script('flatpickr-js', 'https://cdn.jsdelivr.net/npm/flatpickr', array('jquery'), '4.6.9', true);
    wp_enqueue_script('flatpickr-tr', 'https://npmcdn.com/flatpickr/dist/l10n/tr.js', array('flatpickr-js'), '4.6.9', true);
    wp_enqueue_style('select2-css', 'https://cdn.jsdelivr.net/npm/select2@4.1.0-rc.0/dist/css/select2.min.css');
    wp_enqueue_script('select2-js', 'https://cdn.jsdelivr.net/npm/select2@4.1.0-rc.0/dist/js/select2.min.js', array('jquery'), '4.1.0', true);
    wp_add_inline_style('admin-bar', '.h2l-color-option { display: inline-block; width: 30px; height: 30px; border-radius: 50%; margin-right: 10px; cursor: pointer; border: 2px solid transparent; box-shadow: 0 1px 3px rgba(0,0,0,0.2); transition: transform 0.2s; }.h2l-color-option:hover { transform: scale(1.1); }.h2l-color-option.selected { border-color: #333; transform: scale(1.1); box-shadow: 0 0 0 2px #fff, 0 0 0 4px #333; }.subsubsub { float: none; margin-bottom: 15px; }.select2-container { display: block; width: 100% !important; margin-bottom: 5px; }.select2-container .select2-selection--single { height: 38px; border-color: #8c8f94; }.select2-container .select2-selection--single .select2-selection__rendered { line-height: 36px; padding-left: 10px; }.select2-container .select2-selection--single .select2-selection__arrow { height: 36px; }.select2-container--default .select2-selection--multiple { border-color: #8c8f94; min-height: 38px; }.select2-search__field { min-height: 28px; margin-top: 5px !important; }.h2l-dot { display:inline-block; width:10px; height:10px; border-radius:50%; margin-right:8px; }.h2l-label-card { display: inline-flex; align-items: center; background: #fff; padding: 6px 12px; border: 1px solid #ddd; border-radius: 20px; margin: 0 8px 8px 0; }.h2l-label-dot { width: 10px; height: 10px; border-radius: 50%; margin-right: 8px; }.h2l-section-list { margin-top: 10px; background: #f9f9f9; border: 1px solid #e5e5e5; padding: 10px; border-radius: 4px; }.h2l-section-item { display: flex; justify-content: space-between; padding: 5px 0; border-bottom: 1px solid #eee; align-items: center; }.h2l-section-item:last-child { border-bottom: none; }');
}

function h2l_get_color_palette() { return ['#db4c3f', '#e67e22', '#f1c40f', '#27ae60', '#2980b9', '#8e44ad', '#2c3e50', '#7f8c8d', '#e84393', '#00cec9']; }
function h2l_show_admin_notice($msg, $type = 'success') { echo '<div class="notice notice-' . $type . ' is-dismissible"><p>' . esc_html($msg) . '</p></div>'; }
function h2l_handle_status_actions($table_name) {
    global $wpdb;
    if (!isset($_GET['id']) || !isset($_GET['action'])) return;
    $id = intval($_GET['id']); $action = $_GET['action'];
    if ($action == 'trash') { $wpdb->update($table_name, array('status' => 'trash'), array('id' => $id)); h2l_show_admin_notice('Çöp kutusuna taşındı.'); }
    elseif ($action == 'restore') { $new_status = ($table_name == $wpdb->prefix . 'h2l_tasks') ? 'in_progress' : 'active'; $wpdb->update($table_name, array('status' => $new_status), array('id' => $id)); h2l_show_admin_notice('Geri alındı.'); }
    elseif ($action == 'delete_permanent') { $wpdb->delete($table_name, array('id' => $id)); h2l_show_admin_notice('Kalıcı silindi.'); }
}

// 1. GÖREVLER
function h2l_render_tasks_page() {
    global $wpdb;
    $table_tasks = $wpdb->prefix . 'h2l_tasks'; 
    $table_projects = $wpdb->prefix . 'h2l_projects'; 
    $table_folders = $wpdb->prefix . 'h2l_folders'; 
    $table_sections = $wpdb->prefix . 'h2l_sections';

    if (isset($_GET['action']) && $_GET['action'] == 'restore' && isset($_GET['id'])) { 
        $wpdb->update($table_tasks, array('status' => 'in_progress'), array('id' => intval($_GET['id']))); 
        h2l_show_admin_notice('Görev geri alındı.'); 
    } else { 
        h2l_handle_status_actions($table_tasks); 
    }

    if (isset($_POST['bulk_action']) && isset($_POST['bulk_ids'])) {
        check_admin_referer('h2l_bulk_tasks');
        $action = sanitize_text_field($_POST['bulk_action']);
        $ids = array_map('intval', $_POST['bulk_ids']);
        
        if (!empty($ids)) {
            $ids_placeholder = implode(',', $ids);
            
            if ($action === 'trash') {
                $wpdb->query("UPDATE $table_tasks SET status = 'trash' WHERE id IN ($ids_placeholder)");
                h2l_show_admin_notice(count($ids) . ' görev çöp kutusuna taşındı.');
            } elseif ($action === 'restore') {
                $wpdb->query("UPDATE $table_tasks SET status = 'in_progress' WHERE id IN ($ids_placeholder)");
                h2l_show_admin_notice(count($ids) . ' görev geri alındı.');
            } elseif ($action === 'delete_permanent') {
                $wpdb->query("DELETE FROM $table_tasks WHERE id IN ($ids_placeholder)");
                h2l_show_admin_notice(count($ids) . ' görev kalıcı olarak silindi.');
            }
        }
    }

    if (isset($_POST['empty_trash']) && $_POST['empty_trash'] == 1) {
        check_admin_referer('h2l_empty_trash');
        $wpdb->delete($table_tasks, array('status' => 'trash'));
        h2l_show_admin_notice('Çöp kutusu boşaltıldı.');
    }

    $view_status = isset($_GET['status_view']) ? $_GET['status_view'] : 'active';
    $where = $view_status == 'trash' ? "WHERE t.status = 'trash'" : "WHERE t.status != 'trash'";
    
    if($wpdb->get_var("SHOW TABLES LIKE '$table_sections'") != $table_sections) { echo '<div class="wrap"><div class="notice notice-warning"><p>Sistem yapılandırılıyor, lütfen sayfayı yenileyiniz.</p></div></div>'; return; }
    
    $search = isset($_GET['s']) ? sanitize_text_field($_GET['s']) : ''; 
    $f_project = isset($_GET['project_id']) ? intval($_GET['project_id']) : 0; 
    $f_folder = isset($_GET['folder_id']) ? intval($_GET['folder_id']) : 0; 
    $f_date = isset($_GET['due_date']) ? sanitize_text_field($_GET['due_date']) : '';
    
    if($search) $where .= $wpdb->prepare(" AND t.title LIKE %s", '%'. $wpdb->esc_like($search) .'%');
    if($f_project) $where .= $wpdb->prepare(" AND t.project_id = %d", $f_project);
    if($f_folder) $where .= $wpdb->prepare(" AND p.folder_id = %d", $f_folder);
    if($f_date) $where .= $wpdb->prepare(" AND DATE(t.due_date) = %s", $f_date);

    $per_page = 20;
    $current_page = isset($_GET['paged']) ? max(1, intval($_GET['paged'])) : 1;
    $offset = ($current_page - 1) * $per_page;

    $total_items = $wpdb->get_var("SELECT COUNT(*) FROM $table_tasks t LEFT JOIN $table_projects p ON t.project_id = p.id $where");
    $count_active = $wpdb->get_var("SELECT COUNT(*) FROM $table_tasks WHERE status != 'trash'");
    $count_trash = $wpdb->get_var("SELECT COUNT(*) FROM $table_tasks WHERE status = 'trash'");
    
    $tasks = $wpdb->get_results("SELECT t.*, p.title as project_title, f.name as folder_name, s.name as section_name, pt.title as parent_task_title FROM $table_tasks t LEFT JOIN $table_projects p ON t.project_id = p.id LEFT JOIN $table_folders f ON p.folder_id = f.id LEFT JOIN $table_sections s ON t.section_id = s.id LEFT JOIN $table_tasks pt ON t.parent_task_id = pt.id $where ORDER BY t.created_at DESC LIMIT $per_page OFFSET $offset");
    
    $all_projects = $wpdb->get_results("SELECT * FROM $table_projects WHERE status != 'trash'");
    $all_folders = $wpdb->get_results("SELECT * FROM $table_folders");
    ?>
    <div class="wrap"><h1 class="wp-heading-inline">Görevler</h1><a href="admin.php?page=h2l-task-edit" class="page-title-action">Ekle</a><hr class="wp-header-end"><ul class="subsubsub"><li class="all"><a href="admin.php?page=h2l-tasks" class="<?php echo $view_status!='trash'?'current':''; ?>">Tümü (<?php echo $count_active; ?>)</a> |</li><li class="trash"><a href="admin.php?page=h2l-tasks&status_view=trash" class="<?php echo $view_status=='trash'?'current':''; ?>">Çöp (<?php echo $count_trash; ?>)</a></li></ul>
        <form method="get" style="clear:both; margin-bottom:15px; background:#fff; padding:15px; border:1px solid #ccd0d4;"><input type="hidden" name="page" value="h2l-tasks" /><?php if($view_status=='trash'): ?><input type="hidden" name="status_view" value="trash" /><?php endif; ?><div style="display:flex; flex-wrap:wrap; gap:10px; align-items:flex-end;"><div style="flex:1"><label>Arama</label><input type="search" name="s" value="<?php echo esc_attr($search); ?>" style="width:100%"></div><div style="flex:1"><label>Klasör</label><select name="folder_id" class="h2l-select2"><option value="0">Tüm Klasörler</option><?php foreach($all_folders as $f) echo '<option value="'.$f->id.'" '.selected($f_folder, $f->id, false).'>'.$f->name.'</option>'; ?></select></div><div style="flex:1"><label>Proje</label><select name="project_id" class="h2l-select2"><option value="0">Tüm Projeler</option><?php foreach($all_projects as $p) echo '<option value="'.$p->id.'" '.selected($f_project, $p->id, false).'>'.$p->title.'</option>'; ?></select></div><div style="flex:0 0 140px"><label>Tarih</label><input type="text" name="due_date" class="h2l-datetime" value="<?php echo esc_attr($f_date); ?>" style="width:100%"></div><div><input type="submit" class="button" value="Filtrele"></div></div></form>
        
        <form method="post">
            <?php wp_nonce_field('h2l_bulk_tasks'); ?>
            <div class="tablenav top">
                <div class="alignleft actions bulkactions">
                    <select name="bulk_action">
                        <option value="-1">Toplu İşlemler</option>
                        <?php if ($view_status == 'trash'): ?>
                            <option value="restore">Geri Al</option>
                            <option value="delete_permanent">Kalıcı Olarak Sil</option>
                        <?php else: ?>
                            <option value="trash">Çöp Kutusuna Taşı</option>
                        <?php endif; ?>
                    </select>
                    <input type="submit" class="button action" value="Uygula">
                </div>
                <?php if ($view_status == 'trash' && $count_trash > 0): ?>
                    <div class="alignleft actions"><button type="submit" name="empty_trash" value="1" class="button delete" onclick="return confirm('Çöp kutusunu boşaltmak istediğinize emin misiniz?');" form="form-empty-trash">Çöpü Boşalt</button></div>
                <?php endif; ?>
                <div class="tablenav-pages">
                    <span class="displaying-num"><?php echo $total_items; ?> öğe</span>
                    <?php echo paginate_links(array('base' => add_query_arg('paged', '%#%'), 'format' => '', 'prev_text' => '&laquo;', 'next_text' => '&raquo;', 'total' => ceil($total_items / $per_page), 'current' => $current_page)); ?>
                </div>
                <br class="clear">
            </div>

            <table class="wp-list-table widefat fixed striped"><thead><tr><td id="cb" class="manage-column column-cb check-column"><input type="checkbox"></td><th>Görev</th><th>Bölüm</th><th>Proje</th><th>Klasör</th><th>Öncelik</th><th>Durum</th><th>Atanan</th></tr></thead><tbody>
                <?php if($tasks): foreach($tasks as $t): 
                    $p_data = [1=>['#d1453b','P1'], 2=>['#eb8909','P2'], 3=>['#246fe0','P3'], 4=>['#808080','P4']]; $p = $p_data[$t->priority]??$p_data[4];
                    $assignees = !empty($t->assignee_ids) ? json_decode((string)$t->assignee_ids) : [];
                    $assignee_html = '-';
                    if(is_array($assignees) && !empty($assignees)) { $u = get_userdata($assignees[0]); if($u) $assignee_html = get_avatar($u->ID, 20).' '.esc_html($u->display_name); if(count($assignees)>1) $assignee_html.=' +'.(count($assignees)-1); }
                    
                    $status_map = ['not_started' => 'Başlamadı', 'in_progress' => 'Devam Ediyor', 'on_hold' => 'Beklemede', 'in_review' => 'Revizyonda', 'pending_approval' => 'Onay Bekliyor', 'cancelled' => 'İptal Edildi', 'completed' => 'Tamamlandı', 'open' => 'Devam Ediyor'];
                    $status_text = isset($status_map[$t->status]) ? $status_map[$t->status] : ucfirst($t->status);
                    
                    $parent_html = '';
                    if (!empty($t->parent_task_title)) {
                        $parent_html = '<span style="display:block; font-size:11px; color:#888;">' . esc_html(wp_strip_all_tags($t->parent_task_title)) . ' &raquo;</span>';
                    }
                ?>
                <tr><th scope="row" class="check-column"><input type="checkbox" name="bulk_ids[]" value="<?php echo $t->id; ?>"></th>
                <td>
                    <?php echo $parent_html; ?>
                    <strong><a href="?page=h2l-task-edit&id=<?php echo $t->id; ?>">
                        <?php echo esc_html(wp_strip_all_tags($t->title)); ?>
                    </a></strong>
                    <div class="row-actions"><?php if($view_status=='trash'): ?><span class="restore"><a href="?page=h2l-tasks&action=restore&id=<?php echo $t->id; ?>&status_view=trash">Geri Al</a></span><?php else: ?><span class="edit"><a href="?page=h2l-task-edit&id=<?php echo $t->id; ?>">Düzenle</a> | </span><span class="trash"><a href="?page=h2l-tasks&action=trash&id=<?php echo $t->id; ?>">Çöp</a></span><?php endif; ?></div>
                </td>
                <td><?php echo $t->section_name?esc_html($t->section_name):'-'; ?></td><td><?php echo esc_html($t->project_title); ?></td><td><?php echo esc_html($t->folder_name); ?></td>
                <td><span style="color:<?php echo $p[0]; ?>; font-weight:bold;"><?php echo $p[1]; ?></span></td><td><?php echo $status_text; ?></td><td><?php echo $assignee_html; ?></td></tr>
                <?php endforeach; else: ?><tr><td colspan="8">Görev bulunamadı.</td></tr><?php endif; ?>
            </tbody></table>
            
            <div class="tablenav bottom">
                <div class="tablenav-pages">
                    <span class="displaying-num"><?php echo $total_items; ?> öğe</span>
                    <?php echo paginate_links(array('base' => add_query_arg('paged', '%#%'), 'format' => '', 'prev_text' => '&laquo;', 'next_text' => '&raquo;', 'total' => ceil($total_items / $per_page), 'current' => $current_page)); ?>
                </div>
            </div>
        </form>
        
        <?php if ($view_status == 'trash'): ?>
        <form method="post" id="form-empty-trash">
            <?php wp_nonce_field('h2l_empty_trash'); ?>
            <input type="hidden" name="empty_trash" value="1">
        </form>
        <?php endif; ?>
    </div>
    <?php
}

// 2. PROJELER
function h2l_render_projects_page() {
    global $wpdb; 
    $table_projects = $wpdb->prefix . 'h2l_projects'; 
    $table_folders = $wpdb->prefix . 'h2l_folders'; 
    $table_tasks = $wpdb->prefix . 'h2l_tasks'; 
    
    h2l_handle_status_actions($table_projects);

    if (isset($_POST['bulk_action']) && isset($_POST['bulk_ids'])) {
        check_admin_referer('h2l_bulk_projects');
        $action = sanitize_text_field($_POST['bulk_action']);
        $ids = array_map('intval', $_POST['bulk_ids']);
        
        if (!empty($ids)) {
            $ids_placeholder = implode(',', $ids);
            
            if ($action === 'trash') {
                $wpdb->query("UPDATE $table_projects SET status = 'trash' WHERE id IN ($ids_placeholder)");
                h2l_show_admin_notice(count($ids) . ' proje çöp kutusuna taşındı.');
            } elseif ($action === 'restore') {
                $wpdb->query("UPDATE $table_projects SET status = 'active' WHERE id IN ($ids_placeholder)");
                h2l_show_admin_notice(count($ids) . ' proje geri alındı.');
            } elseif ($action === 'delete_permanent') {
                $wpdb->query("DELETE FROM $table_projects WHERE id IN ($ids_placeholder)");
                h2l_show_admin_notice(count($ids) . ' proje kalıcı olarak silindi.');
            }
        }
    }

    if (isset($_POST['empty_trash']) && $_POST['empty_trash'] == 1) {
        check_admin_referer('h2l_empty_trash');
        $wpdb->delete($table_projects, array('status' => 'trash'));
        h2l_show_admin_notice('Çöp kutusu boşaltıldı.');
    }

    $view_status = isset($_GET['status_view']) ? $_GET['status_view'] : 'active';
    $where = $view_status == 'trash' ? "WHERE p.status = 'trash'" : "WHERE p.status != 'trash'";
    $search = isset($_GET['s']) ? sanitize_text_field($_GET['s']) : ''; 
    $filter_folder = isset($_GET['folder_id']) ? intval($_GET['folder_id']) : 0;
    
    if($search) $where .= $wpdb->prepare(" AND p.title LIKE %s", '%' . $wpdb->esc_like($search) . '%');
    if($filter_folder) $where .= $wpdb->prepare(" AND p.folder_id = %d", $filter_folder);
    
    $per_page = 20;
    $current_page = isset($_GET['paged']) ? max(1, intval($_GET['paged'])) : 1;
    $offset = ($current_page - 1) * $per_page;

    $total_items = $wpdb->get_var("SELECT COUNT(*) FROM $table_projects p $where");
    $count_active = $wpdb->get_var("SELECT COUNT(*) FROM $table_projects WHERE status != 'trash'");
    $count_trash = $wpdb->get_var("SELECT COUNT(*) FROM $table_projects WHERE status = 'trash'");
    
    $projects = $wpdb->get_results("SELECT p.*, f.name as folder_name, (SELECT COUNT(*) FROM $table_tasks t WHERE t.project_id = p.id AND t.status != 'trash') as task_count FROM $table_projects p LEFT JOIN $table_folders f ON p.folder_id = f.id $where ORDER BY p.created_at DESC LIMIT $per_page OFFSET $offset");
    $all_folders = $wpdb->get_results("SELECT * FROM $table_folders");
    ?>
    <div class="wrap"><h1>Projeler</h1><a href="admin.php?page=h2l-project-edit" class="page-title-action">Ekle</a><hr class="wp-header-end"><ul class="subsubsub"><li class="all"><a href="admin.php?page=h2l-projects" class="<?php echo $view_status!='trash'?'current':''; ?>">Tümü (<?php echo $count_active; ?>)</a> |</li><li class="trash"><a href="admin.php?page=h2l-projects&status_view=trash" class="<?php echo $view_status=='trash'?'current':''; ?>">Çöp (<?php echo $count_trash; ?>)</a></li></ul><form method="get" style="margin-bottom:15px; display:flex; gap:10px;"><input type="hidden" name="page" value="h2l-projects" /><?php if($view_status=='trash'): ?><input type="hidden" name="status_view" value="trash" /><?php endif; ?><input type="search" name="s" value="<?php echo esc_attr($search); ?>" placeholder="Ara..." style="flex:1"><select name="folder_id" class="h2l-select2" style="flex:1"><option value="0">Tüm Klasörler</option><?php foreach($all_folders as $f) echo '<option value="'.$f->id.'" '.selected($filter_folder, $f->id, false).'>'.$f->name.'</option>'; ?></select><input type="submit" class="button" value="Filtrele"></form>
        
        <form method="post">
            <?php wp_nonce_field('h2l_bulk_projects'); ?>
            <div class="tablenav top">
                <div class="alignleft actions bulkactions">
                    <select name="bulk_action">
                        <option value="-1">Toplu İşlemler</option>
                        <?php if ($view_status == 'trash'): ?>
                            <option value="restore">Geri Al</option>
                            <option value="delete_permanent">Kalıcı Olarak Sil</option>
                        <?php else: ?>
                            <option value="trash">Çöp Kutusuna Taşı</option>
                        <?php endif; ?>
                    </select>
                    <input type="submit" class="button action" value="Uygula">
                </div>
                <?php if ($view_status == 'trash' && $count_trash > 0): ?>
                    <div class="alignleft actions"><button type="submit" name="empty_trash" value="1" class="button delete" onclick="return confirm('Çöp kutusunu boşaltmak istediğinize emin misiniz?');" form="form-empty-trash">Çöpü Boşalt</button></div>
                <?php endif; ?>
                <div class="tablenav-pages">
                    <span class="displaying-num"><?php echo $total_items; ?> öğe</span>
                    <?php echo paginate_links(array('base' => add_query_arg('paged', '%#%'), 'format' => '', 'prev_text' => '&laquo;', 'next_text' => '&raquo;', 'total' => ceil($total_items / $per_page), 'current' => $current_page)); ?>
                </div>
                <br class="clear">
            </div>

            <table class="wp-list-table widefat fixed striped"><thead><tr><td id="cb" class="manage-column column-cb check-column"><input type="checkbox"></td><th>Klasör</th><th>Proje</th><th>Yöneticiler</th><th>Açıklama</th><th>Görevler</th></tr></thead><tbody><?php if($projects): foreach($projects as $p): $m=!empty($p->managers) ? json_decode((string)$p->managers) : []; $mh=(is_array($m)&&count($m)>0)?count($m).' kişi':'-'; ?><tr><th scope="row" class="check-column"><input type="checkbox" name="bulk_ids[]" value="<?php echo $p->id; ?>"></th><td><?php echo esc_html($p->folder_name); ?></td><td><strong><a href="?page=h2l-project-edit&id=<?php echo $p->id; ?>"><span style="color:<?php echo $p->color; ?>">●</span> <?php echo esc_html($p->title); ?></a></strong><div class="row-actions"><?php if($view_status=='trash'): ?><span class="restore"><a href="?page=h2l-projects&action=restore&id=<?php echo $p->id; ?>&status_view=trash">Geri Al</a></span><?php else: ?><span class="edit"><a href="?page=h2l-project-edit&id=<?php echo $p->id; ?>">Düzenle</a> | </span><span class="trash"><a href="?page=h2l-projects&action=trash&id=<?php echo $p->id; ?>">Çöp</a></span><?php endif; ?></div></td><td><?php echo $mh; ?></td><td><?php echo wp_trim_words($p->description, 8); ?></td><td><span class="badge"><?php echo $p->task_count; ?></span></td></tr><?php endforeach; else: ?><tr><td colspan="6">Proje yok.</td></tr><?php endif; ?></tbody></table>
            
            <div class="tablenav bottom">
                <div class="tablenav-pages">
                    <span class="displaying-num"><?php echo $total_items; ?> öğe</span>
                    <?php echo paginate_links(array('base' => add_query_arg('paged', '%#%'), 'format' => '', 'prev_text' => '&laquo;', 'next_text' => '&raquo;', 'total' => ceil($total_items / $per_page), 'current' => $current_page)); ?>
                </div>
            </div>
        </form>
        
        <?php if ($view_status == 'trash'): ?>
        <form method="post" id="form-empty-trash">
            <?php wp_nonce_field('h2l_empty_trash'); ?>
            <input type="hidden" name="empty_trash" value="1">
        </form>
        <?php endif; ?>
    </div>
    <?php
}

// 3. KLASÖRLER
function h2l_render_folders_page() {
    global $wpdb; 
    $table_name = $wpdb->prefix . 'h2l_folders'; 
    $table_projects = $wpdb->prefix . 'h2l_projects'; 
    $edit_mode = false; $edit_data = null;

    if (isset($_GET['action']) && $_GET['action'] == 'edit' && isset($_GET['id'])) { $edit_mode = true; $edit_data = $wpdb->get_row($wpdb->prepare("SELECT * FROM $table_name WHERE id = %d", intval($_GET['id']))); }
    if (isset($_GET['action']) && $_GET['action'] == 'delete' && isset($_GET['id'])) { $wpdb->delete($table_name, array('id' => intval($_GET['id']))); h2l_show_admin_notice('Silindi.'); }
    
    if (isset($_POST['h2l_action'])) { check_admin_referer('h2l_save_folder'); $data = array('name'=>sanitize_text_field($_POST['folder_name']),'slug'=>sanitize_title($_POST['folder_name']),'description'=>sanitize_textarea_field($_POST['folder_desc']),'access_type'=>sanitize_text_field($_POST['folder_access']),'owner_id'=>get_current_user_id()); if (isset($_POST['folder_id']) && intval($_POST['folder_id']) > 0) { $wpdb->update($table_name, $data, array('id'=>intval($_POST['folder_id']))); h2l_show_admin_notice('Güncellendi.'); echo "<script>window.location.href='admin.php?page=h2l-folders';</script>"; } else { $wpdb->insert($table_name, $data); h2l_show_admin_notice('Oluşturuldu.'); } }

    if (isset($_POST['bulk_action']) && isset($_POST['bulk_ids'])) {
        check_admin_referer('h2l_bulk_folders');
        $action = sanitize_text_field($_POST['bulk_action']);
        $ids = array_map('intval', $_POST['bulk_ids']);
        if (!empty($ids) && $action === 'delete') {
            $ids_placeholder = implode(',', $ids);
            $wpdb->query("DELETE FROM $table_name WHERE id IN ($ids_placeholder)");
            h2l_show_admin_notice(count($ids) . ' klasör silindi.');
        }
    }

    $per_page = 20;
    $current_page = isset($_GET['paged']) ? max(1, intval($_GET['paged'])) : 1;
    $offset = ($current_page - 1) * $per_page;
    $total_items = $wpdb->get_var("SELECT COUNT(*) FROM $table_name");

    $folders = $wpdb->get_results("SELECT f.*, COUNT(p.id) as project_count FROM $table_name f LEFT JOIN $table_projects p ON f.id = p.folder_id AND p.status != 'trash' GROUP BY f.id ORDER BY f.name ASC LIMIT $per_page OFFSET $offset");
    
    ?>
    <div class="wrap"><h1>Klasörler</h1><hr class="wp-header-end"><div id="col-container" class="wp-clearfix"><div id="col-left"><div class="form-wrap"><h2><?php echo $edit_mode?'Düzenle':'Yeni Ekle'; ?></h2><form method="post"><?php wp_nonce_field('h2l_save_folder'); ?><input type="hidden" name="h2l_action" value="save_folder"><?php if($edit_mode): ?><input type="hidden" name="folder_id" value="<?php echo $edit_data->id; ?>"><?php endif; ?><div class="form-field"><label>Ad</label><input name="folder_name" type="text" value="<?php echo $edit_mode?$edit_data->name:''; ?>" required></div><div class="form-field"><label>Kısaltma</label><input name="folder_slug" type="text" value="<?php echo $edit_mode?$edit_data->slug:''; ?>"></div><div class="form-field"><label>Erişim</label><select name="folder_access"><option value="private" <?php selected($edit_mode&&$edit_data->access_type=='private'); ?>>Özel</option><option value="public" <?php selected($edit_mode&&$edit_data->access_type=='public'); ?>>Genel</option></select></div><div class="form-field"><label>Açıklama</label><textarea name="folder_desc" rows="3"><?php echo $edit_mode?$edit_data->description:''; ?></textarea></div><p class="submit"><input type="submit" class="button button-primary" value="Kaydet"></p></form></div></div>
    <div id="col-right">
        <form method="post">
            <?php wp_nonce_field('h2l_bulk_folders'); ?>
            <div class="tablenav top">
                <div class="alignleft actions bulkactions">
                    <select name="bulk_action">
                        <option value="-1">Toplu İşlemler</option>
                        <option value="delete">Sil</option>
                    </select>
                    <input type="submit" class="button action" value="Uygula" onclick="if(document.querySelector('[name=bulk_action]').value == 'delete') return confirm('Seçili klasörleri silmek istediğinize emin misiniz?');">
                </div>
                <div class="tablenav-pages">
                    <span class="displaying-num"><?php echo $total_items; ?> öğe</span>
                    <?php echo paginate_links(array('base' => add_query_arg('paged', '%#%'), 'format' => '', 'prev_text' => '&laquo;', 'next_text' => '&raquo;', 'total' => ceil($total_items / $per_page), 'current' => $current_page)); ?>
                </div>
                <br class="clear">
            </div>

            <table class="wp-list-table widefat fixed striped"><thead><tr><td id="cb" class="manage-column column-cb check-column"><input type="checkbox"></td><th>Ad</th><th>Açıklama</th><th>Erişim</th><th>Proje</th></tr></thead><tbody><?php if($folders): foreach($folders as $f): ?><tr><th scope="row" class="check-column"><input type="checkbox" name="bulk_ids[]" value="<?php echo $f->id; ?>"></th><td><strong><a href="?page=h2l-folders&action=edit&id=<?php echo $f->id; ?>"><?php echo esc_html($f->name); ?></a></strong><div class="row-actions"><span class="edit"><a href="?page=h2l-folders&action=edit&id=<?php echo $f->id; ?>">Düzenle</a> | </span><span class="trash"><a href="?page=h2l-folders&action=delete&id=<?php echo $f->id; ?>" onclick="return confirm('Sil?')">Sil</a></span></div></td><td><?php echo esc_html($f->description); ?></td><td><?php echo $f->access_type=='private'?'Özel':'Genel'; ?></td><td><?php echo $f->project_count; ?></td></tr><?php endforeach; endif; ?></tbody></table>
            
            <div class="tablenav bottom">
                <div class="tablenav-pages">
                    <span class="displaying-num"><?php echo $total_items; ?> öğe</span>
                    <?php echo paginate_links(array('base' => add_query_arg('paged', '%#%'), 'format' => '', 'prev_text' => '&laquo;', 'next_text' => '&raquo;', 'total' => ceil($total_items / $per_page), 'current' => $current_page)); ?>
                </div>
            </div>
        </form>
    </div></div></div>
    <?php
}

// 4. ETİKETLER
function h2l_render_labels_page() {
    global $wpdb; $table_labels = $wpdb->prefix . 'h2l_labels';
    if(isset($_POST['h2l_action'])) { check_admin_referer('h2l_save_label'); $wpdb->insert($table_labels, array('name'=>sanitize_text_field($_POST['label_name']), 'slug'=>sanitize_title($_POST['label_name']), 'color'=>sanitize_hex_color($_POST['color']))); h2l_show_admin_notice('Eklendi.'); }
    if(isset($_GET['action']) && $_GET['action'] == 'delete') { $wpdb->delete($table_labels, array('id'=>intval($_GET['id']))); h2l_show_admin_notice('Silindi.'); }
    $labels = $wpdb->get_results("SELECT * FROM $table_labels ORDER BY name ASC"); $colors = h2l_get_color_palette();
    ?>
    <div class="wrap"><h1>Etiketler</h1><hr class="wp-header-end"><div id="col-container" class="wp-clearfix"><div id="col-left"><div class="form-wrap"><h2>Yeni Etiket</h2><form method="post"><?php wp_nonce_field('h2l_save_label'); ?><input type="hidden" name="h2l_action" value="save_label"><div class="form-field"><label>Ad</label><input type="text" name="label_name" required></div><div class="form-field"><label>Renk</label><input type="hidden" name="color" id="label_color" value="#808080"><div style="display:flex; gap:5px;"><?php foreach($colors as $c): ?><div class="h2l-color-option" style="background:<?php echo $c; ?>" data-color="<?php echo $c; ?>" data-input-id="label_color"></div><?php endforeach; ?></div></div><p class="submit"><input type="submit" class="button button-primary" value="Ekle"></p></form></div></div><div id="col-right"><div style="padding-top:20px;"><?php if($labels): foreach($labels as $l): ?><div class="h2l-label-card"><span class="h2l-label-dot" style="background:<?php echo $l->color; ?>"></span><span class="h2l-label-name"><?php echo esc_html($l->name); ?></span><a href="?page=h2l-labels&action=delete&id=<?php echo $l->id; ?>" onclick="return confirm('Sil?')" style="text-decoration:none;color:#a00;">&times;</a></div><?php endforeach; else: echo '<p>Etiket yok.</p>'; endif; ?></div></div></div></div>
    <?php
}

// 5. PROJE DÜZENLE
function h2l_render_project_edit_page() {
    global $wpdb; $table_projects = $wpdb->prefix . 'h2l_projects'; $table_sections = $wpdb->prefix . 'h2l_sections'; $project_id = isset($_GET['id']) ? intval($_GET['id']) : 0; $project = null;
    if($project_id) $project = $wpdb->get_row($wpdb->prepare("SELECT * FROM $table_projects WHERE id = %d", $project_id));
    if(isset($_POST['add_section']) && $project_id) { $s_name = sanitize_text_field($_POST['new_section_name']); if($s_name) { if($wpdb->get_var("SHOW TABLES LIKE '$table_sections'") == $table_sections) { $wpdb->insert($table_sections, array('project_id'=>$project_id, 'name'=>$s_name)); h2l_show_admin_notice('Bölüm eklendi.'); } else { h2l_show_admin_notice('Veritabanı güncelleniyor...', 'warning'); } } }
    if(isset($_GET['delete_section'])) { $wpdb->delete($table_sections, array('id'=>intval($_GET['delete_section']))); h2l_show_admin_notice('Bölüm silindi.'); }
    if(isset($_POST['h2l_save_project'])) { check_admin_referer('h2l_save_project'); $data = array('title'=>sanitize_text_field($_POST['title']), 'slug'=>sanitize_title($_POST['title']),'folder_id'=>intval($_POST['folder_id']), 'color'=>sanitize_hex_color($_POST['color']),'description'=>wp_kses_post($_POST['description']), 'view_type'=>isset($_POST['view_type']) ? sanitize_text_field($_POST['view_type']) : 'list','managers'=>isset($_POST['managers'])?json_encode(array_map('intval', $_POST['managers'])):'[]', 'owner_id'=>get_current_user_id()); if(!$project_id) $data['status'] = 'active'; if($project_id) { $wpdb->update($table_projects, $data, array('id'=>$project_id)); h2l_show_admin_notice('Güncellendi.'); } else { $wpdb->insert($table_projects, $data); $project_id=$wpdb->insert_id; h2l_show_admin_notice('Oluşturuldu.'); } $project = (object)array_merge((array)$project, $data); $project->id = $project_id; }
    $folders = $wpdb->get_results("SELECT * FROM {$wpdb->prefix}h2l_folders"); $users = get_users(); $colors = h2l_get_color_palette();
    $sections = []; if($project_id && $wpdb->get_var("SHOW TABLES LIKE '$table_sections'") == $table_sections) { $sections = $wpdb->get_results($wpdb->prepare("SELECT * FROM $table_sections WHERE project_id = %d ORDER BY id ASC", $project_id)); }
    ?>
    <div class="wrap"><h1><?php echo $project?'Projeyi Düzenle':'Yeni Proje'; ?></h1><form method="post"><?php wp_nonce_field('h2l_save_project'); ?><input type="hidden" name="h2l_save_project" value="1"><div id="poststuff"><div id="post-body" class="metabox-holder columns-2"><div id="post-body-content"><table class="form-table"><tr><th>Ad</th><td><input name="title" type="text" value="<?php echo $project?esc_attr($project->title):''; ?>" class="regular-text" required></td></tr><tr><th>Klasör</th><td><select name="folder_id" class="h2l-select2" required><option value="">Seç...</option><?php foreach($folders as $f): ?><option value="<?php echo $f->id; ?>" <?php selected($project?$project->folder_id:0, $f->id); ?>><?php echo esc_html($f->name); ?></option><?php endforeach; ?></select></td></tr><tr><th>Renk</th><td><input type="hidden" name="color" id="p_color" value="<?php echo $project?$project->color:'#808080'; ?>"><?php foreach($colors as $c): ?><div class="h2l-color-option <?php echo ($project&&$project->color==$c)?'selected':''; ?>" style="background:<?php echo $c; ?>" data-color="<?php echo $c; ?>" data-input-id="p_color"></div><?php endforeach; ?></td></tr><tr><th>Yöneticiler</th><td><select name="managers[]" multiple class="h2l-select2"><?php $m=!empty($project->managers) ? json_decode((string)$project->managers) : []; foreach($users as $u): ?><option value="<?php echo $u->ID; ?>" <?php echo in_array($u->ID, (array)$m)?'selected':''; ?>><?php echo $u->display_name; ?></option><?php endforeach; ?></select></td></tr><tr><th>Açıklama</th><td><textarea name="description" rows="3" class="large-text"><?php echo $project?esc_textarea($project->description):''; ?></textarea></td></tr></table><p class="submit"><input type="submit" class="button button-primary" value="Kaydet"></p></div><div id="postbox-container-1" class="postbox-container"><?php if($project_id): ?><div class="postbox"><h2 class="hndle">Bölümler (Sections)</h2><div class="inside"><div style="display:flex; gap:5px; margin-bottom:10px;"><input type="text" name="new_section_name" placeholder="Yeni bölüm adı..." style="flex:1"><button type="submit" name="add_section" value="1" class="button">Ekle</button></div><div class="h2l-section-list"><?php if($sections): foreach($sections as $s): ?><div class="h2l-section-item"><span><?php echo esc_html($s->name); ?></span><a href="?page=h2l-project-edit&id=<?php echo $project_id; ?>&delete_section=<?php echo $s->id; ?>" style="color:#a00;text-decoration:none;">&times;</a></div><?php endforeach; else: echo 'Henüz bölüm yok.'; endif; ?></div></div></div><?php endif; ?></div></div></div></form></div>
    <?php
}

// 6. GÖREV DÜZENLE
function h2l_render_task_edit_page() {
    global $wpdb; $table_tasks = $wpdb->prefix . 'h2l_tasks'; $table_labels = $wpdb->prefix . 'h2l_labels'; $table_task_labels = $wpdb->prefix . 'h2l_task_labels'; $table_sections = $wpdb->prefix . 'h2l_sections';
    $task_id = isset($_GET['id']) ? intval($_GET['id']) : 0; $task = null; $task_labels = [];
    if($task_id) { $task = $wpdb->get_row($wpdb->prepare("SELECT * FROM $table_tasks WHERE id = %d", $task_id)); $task_labels = $wpdb->get_col($wpdb->prepare("SELECT label_id FROM $table_task_labels WHERE task_id = %d", $task_id)); }
    if(isset($_POST['h2l_save_task'])) { check_admin_referer('h2l_save_task'); $data = array('title'=>wp_kses_post($_POST['title']), 'project_id'=>intval($_POST['project_id']),'section_id'=>intval($_POST['section_id']), 'priority'=>intval($_POST['priority']),'status'=>sanitize_text_field($_POST['status']), 'due_date'=>sanitize_text_field($_POST['due_date']),'assignee_ids'=>isset($_POST['assignees'])?json_encode(array_map('intval', $_POST['assignees'])):'[]','location'=>sanitize_text_field($_POST['location']), 'reminder_enabled'=>isset($_POST['reminder'])?1:0,'content'=>wp_kses_post($_POST['content']), 'slug'=>sanitize_title($_POST['title']), 'parent_task_id' => isset($_POST['parent_task_id']) ? intval($_POST['parent_task_id']) : 0); if(!$task_id) $data['created_at'] = current_time('mysql'); if($task_id) { $wpdb->update($table_tasks, $data, array('id'=>$task_id)); $save_id=$task_id; h2l_show_admin_notice('Güncellendi.'); } else { $wpdb->insert($table_tasks, $data); $save_id=$wpdb->insert_id; h2l_show_admin_notice('Oluşturuldu.'); } $wpdb->delete($table_task_labels, array('task_id'=>$save_id)); $new_labels = isset($_POST['labels']) ? $_POST['labels'] : []; foreach($new_labels as $lbl) { if(is_numeric($lbl)) { $lid=$lbl; } else { $wpdb->insert($table_labels, ['name'=>sanitize_text_field($lbl), 'slug'=>sanitize_title($lbl), 'color'=>'#808080']); $lid=$wpdb->insert_id; } $wpdb->insert($table_task_labels, array('task_id'=>$save_id, 'label_id'=>$lid)); } $task = $wpdb->get_row($wpdb->prepare("SELECT * FROM $table_tasks WHERE id = %d", $save_id)); $task_labels = isset($_POST['labels']) ? $_POST['labels'] : []; }
    $projects = $wpdb->get_results("SELECT * FROM {$wpdb->prefix}h2l_projects WHERE status != 'trash'"); $all_labels = $wpdb->get_results("SELECT * FROM $table_labels ORDER BY name ASC"); $users = get_users();
    $sections_all = []; if($wpdb->get_var("SHOW TABLES LIKE '$table_sections'") == $table_sections) { $sections_all = $wpdb->get_results("SELECT id, project_id, name FROM $table_sections ORDER BY sort_order ASC"); } $sections_json = []; foreach($sections_all as $s) { $sections_json[$s->project_id][$s->id] = $s->name; } echo '<script>window.h2lSections = ' . json_encode($sections_json) . ';</script>';
    $p_data = [1=>['#d1453b','P1 - Kritik'], 2=>['#eb8909','P2 - Yüksek'], 3=>['#246fe0','P3 - Orta'], 4=>['#808080','P4 - Düşük']]; $current_assignees = ($task && !empty($task->assignee_ids)) ? json_decode((string)$task->assignee_ids) : [];
    
    $status_options = [
        'not_started' => 'Başlamadı',
        'in_progress' => 'Devam Ediyor',
        'on_hold' => 'Beklemede',
        'in_review' => 'Revizyonda',
        'pending_approval' => 'Onay Bekliyor',
        'cancelled' => 'İptal Edildi',
        'completed' => 'Tamamlandı',
        'open' => 'Devam Ediyor (Eski)' 
    ];
    ?>
    <div class="wrap"><h1><?php echo $task?'Görevi Düzenle':'Yeni Görev'; ?></h1><form method="post"><?php wp_nonce_field('h2l_save_task'); ?><input type="hidden" name="h2l_save_task" value="1"><div id="poststuff"><div id="post-body" class="metabox-holder columns-2"><div id="post-body-content"><div class="form-field"><label><strong>Başlık</strong></label><textarea name="title" style="width:100%;height:60px;" required><?php echo $task?esc_textarea($task->title):''; ?></textarea></div><div style="margin-top:20px;"><label><strong>Açıklama</strong></label><?php wp_editor($task?$task->content:'', 'content', array('textarea_rows'=>8)); ?></div></div><div id="postbox-container-1" class="postbox-container"><div class="postbox"><h2 class="hndle">Detaylar</h2><div class="inside"><p><label>Proje</label><br><select name="project_id" id="h2l-project-select" class="h2l-select2" required><option value="">Seç...</option><?php foreach($projects as $p): ?><option value="<?php echo $p->id; ?>" <?php selected($task?$task->project_id:0, $p->id); ?>><?php echo esc_html($p->title); ?></option><?php endforeach; ?></select></p><p><label>Bölüm</label><br><select name="section_id" id="h2l-section-select" class="h2l-select2" data-selected="<?php echo $task?$task->section_id:0; ?>"><option value="0">-- Bölümsüz --</option></select></p><p><label>Öncelik</label><br><select name="priority" class="h2l-select2-priority"><?php foreach($p_data as $k=>$v): ?><option value="<?php echo $k; ?>" data-color="<?php echo $v[0]; ?>" <?php selected($task?$task->priority:4, $k); ?>><?php echo $v[1]; ?></option><?php endforeach; ?></select></p><p><label>Durum</label><br><select name="status" class="h2l-select2"><?php foreach($status_options as $k=>$v): ?><option value="<?php echo $k; ?>" <?php selected($task?$task->status:'in_progress', $k); ?>><?php echo $v; ?></option><?php endforeach; ?></select></p><p><label>Tarih</label><br><input type="text" name="due_date" class="h2l-datetime" value="<?php echo $task?esc_attr($task->due_date):''; ?>" style="width:100%"></p><p><label>Atanan</label><br><select name="assignees[]" multiple class="h2l-select2"><?php foreach($users as $u): ?><option value="<?php echo $u->ID; ?>" <?php echo in_array($u->ID, (array)$current_assignees)?'selected':''; ?>><?php echo $u->display_name; ?></option><?php endforeach; ?></select></p><p><label>Etiketler</label><br><select name="labels[]" multiple class="h2l-select2-tags"><?php foreach($all_labels as $l): ?><option value="<?php echo $l->id; ?>" <?php echo in_array($l->id, (array)$task_labels)?'selected':''; ?>><?php echo esc_html($l->name); ?></option><?php endforeach; ?></select></p><p><label>Konum</label><br><input type="text" name="location" value="<?php echo $task?esc_attr($task->location):''; ?>" style="width:100%"></p><p><label>Üst Görev ID (Opsiyonel)</label><br><input type="number" name="parent_task_id" value="<?php echo $task ? esc_attr($task->parent_task_id) : ''; ?>" style="width:100%"></p><p><input type="checkbox" name="reminder" value="1" <?php checked($task?$task->reminder_enabled:1, 1); ?>> Hatırlatıcı Açık</p><input type="submit" class="button button-primary button-large" value="Kaydet" style="width:100%"></div></div></div></div></div></form></div>
    <?php
}

// 7. AYARLAR (YENİ: API & Toplantı Sekmesi)
function h2l_render_settings_page() {
    $active_tab = isset($_GET['tab']) ? $_GET['tab'] : 'general';

    // 1. Kaydetme İşlemi
    if ( isset($_POST['h2l_save_settings']) ) {
        check_admin_referer('h2l_settings_nonce');
        
        if ($active_tab === 'general') {
            update_option('h2l_reminder_subject', sanitize_text_field($_POST['h2l_reminder_subject']));
            update_option('h2l_reminder_body', wp_kses_post($_POST['h2l_reminder_body']));
            update_option('h2l_reminder_footer', wp_kses_post($_POST['h2l_reminder_footer']));
        } elseif ($active_tab === 'api') {
            update_option('h2l_openai_api_key', sanitize_text_field($_POST['h2l_openai_api_key']));
            update_option('h2l_meeting_model', sanitize_text_field($_POST['h2l_meeting_model']));
            update_option('h2l_meeting_max_duration', intval($_POST['h2l_meeting_max_duration']));
        }
        
        h2l_show_admin_notice('Ayarlar kaydedildi.');
    }

    // 2. Test E-postası (Sadece Genel sekmesinde)
    if ( isset($_POST['h2l_send_test_email']) && $active_tab === 'general' ) {
        check_admin_referer('h2l_settings_nonce');
        $test_email = sanitize_email($_POST['h2l_test_email']);
        
        if ( is_email($test_email) && class_exists('H2L_Reminder') ) {
            $reminder = new H2L_Reminder();
            if ( $reminder->send_test_reminder($test_email) ) {
                h2l_show_admin_notice('Test e-postası başarıyla gönderildi.');
            } else {
                h2l_show_admin_notice('E-posta gönderilemedi.', 'error');
            }
        } else {
            h2l_show_admin_notice('Geçersiz e-posta adresi.', 'error');
        }
    }

    // Değerleri Getir
    $subject = get_option('h2l_reminder_subject', '🔔 Hatırlatma: {task_title}');
    $body_intro = get_option('h2l_reminder_body', "Merhaba {user_name},\n\nAşağıdaki görevin zamanı geldi:");
    $footer_text = get_option('h2l_reminder_footer', 'Bu e-posta Hip to List tarafından gönderilmiştir.');
    
    $api_key = get_option('h2l_openai_api_key', '');
    $meeting_model = get_option('h2l_meeting_model', 'gpt-4o-mini');
    $max_duration = get_option('h2l_meeting_max_duration', 60); // Dakika
    ?>
    <div class="wrap">
        <h1>Ayarlar</h1>
        
        <h2 class="nav-tab-wrapper">
            <a href="?page=h2l-settings&tab=general" class="nav-tab <?php echo $active_tab == 'general' ? 'nav-tab-active' : ''; ?>">Genel & Bildirimler</a>
            <a href="?page=h2l-settings&tab=api" class="nav-tab <?php echo $active_tab == 'api' ? 'nav-tab-active' : ''; ?>">API & Toplantı</a>
        </h2>
        
        <form method="post" style="margin-top: 20px;">
            <input type="hidden" name="h2l_save_settings" value="1">
            <?php wp_nonce_field('h2l_settings_nonce'); ?>
            
            <?php if ($active_tab == 'general'): ?>
                <!-- GENEL AYARLAR -->
                <div class="card" style="padding:20px; max-width:800px; margin-bottom: 20px;">
                    <h2>Hatırlatıcı E-posta Şablonu</h2>
                    <p class="description">Kullanıcıya gönderilecek hatırlatma e-postasının içeriğini buradan düzenleyebilirsiniz.</p>
                    
                    <table class="form-table">
                        <tr>
                            <th scope="row"><label for="h2l_reminder_subject">E-posta Başlığı</label></th>
                            <td>
                                <input name="h2l_reminder_subject" type="text" id="h2l_reminder_subject" value="<?php echo esc_attr($subject); ?>" class="regular-text" style="width:100%">
                            </td>
                        </tr>
                        <tr>
                            <th scope="row"><label for="h2l_reminder_body">E-posta Giriş Metni</label></th>
                            <td>
                                <p class="description" style="margin-bottom:5px;">Görev kartının <strong>üstünde</strong> yer alacak metin.</p>
                                <?php 
                                wp_editor($body_intro, 'h2l_reminder_body', array(
                                    'textarea_name' => 'h2l_reminder_body',
                                    'textarea_rows' => 8,
                                    'media_buttons' => false,
                                    'teeny' => true
                                )); 
                                ?>
                                <p class="description" style="margin-top:5px; font-size:12px;">Değişkenler: <code>{user_name}</code></p>
                            </td>
                        </tr>
                        <tr>
                            <th scope="row">Sabit İçerik</th>
                            <td>
                                <div style="background:#f9f9f9; padding:15px; border:1px dashed #ccc; border-radius:4px; color:#777;">
                                    [GÖREV KARTI BURADA GÖRÜNTÜLENİR]<br>
                                    [GÖREVİ GÖRÜNTÜLE BUTONU BURADA GÖRÜNTÜLENİR]
                                </div>
                                <p class="description">Bu alan otomatik oluşturulur ve değiştirilemez.</p>
                            </td>
                        </tr>
                        <tr>
                            <th scope="row"><label for="h2l_reminder_footer">E-posta Alt Bilgisi (Footer)</label></th>
                            <td>
                                <p class="description" style="margin-bottom:5px;">Butonun <strong>altında</strong> yer alacak metin.</p>
                                <?php 
                                wp_editor($footer_text, 'h2l_reminder_footer', array(
                                    'textarea_name' => 'h2l_reminder_footer',
                                    'textarea_rows' => 5,
                                    'media_buttons' => false,
                                    'teeny' => true
                                )); 
                                ?>
                            </td>
                        </tr>
                    </table>
                </div>
            <?php elseif ($active_tab == 'api'): ?>
                <!-- API AYARLARI -->
                <div class="card" style="padding:20px; max-width:800px; margin-bottom: 20px;">
                    <h2>OpenAI & Toplantı Ayarları</h2>
                    <p class="description">Toplantı özetleri ve transkript analizi için gerekli API yapılandırması.</p>
                    
                    <table class="form-table">
                        <tr>
                            <th scope="row"><label for="h2l_openai_api_key">OpenAI API Anahtarı</label></th>
                            <td>
                                <input name="h2l_openai_api_key" type="password" id="h2l_openai_api_key" value="<?php echo esc_attr($api_key); ?>" class="regular-text" style="width:100%">
                                <p class="description">API anahtarınızı <a href="https://platform.openai.com/api-keys" target="_blank">OpenAI Platform</a> üzerinden alabilirsiniz.</p>
                            </td>
                        </tr>
                        <tr>
                            <th scope="row"><label for="h2l_meeting_model">Özetleme Modeli</label></th>
                            <td>
                                <input name="h2l_meeting_model" type="text" id="h2l_meeting_model" value="<?php echo esc_attr($meeting_model); ?>" class="regular-text">
                                <p class="description">Varsayılan: <code>gpt-4o-mini</code>. Maliyet/performans için önerilir.</p>
                            </td>
                        </tr>
                        <tr>
                            <th scope="row"><label for="h2l_meeting_max_duration">Maksimum Toplantı Süresi</label></th>
                            <td>
                                <input name="h2l_meeting_max_duration" type="number" id="h2l_meeting_max_duration" value="<?php echo esc_attr($max_duration); ?>" class="small-text"> dakika
                                <p class="description">Sunucu kaynaklarını korumak için maksimum kayıt süresi.</p>
                            </td>
                        </tr>
                    </table>
                </div>
            <?php endif; ?>
            
            <p class="submit"><input type="submit" class="button button-primary" value="Kaydet"></p>
        </form>

        <?php if ($active_tab == 'general'): ?>
            <!-- Test Gönderme Formu (Sadece Genel sekmesinde) -->
            <div class="card" style="padding:20px; max-width:800px; margin-top: 20px;">
                <h2>Test E-postası Gönder</h2>
                <p class="description">Şablonunuzu test etmek için kendinize bir örnek e-posta gönderin.</p>
                <form method="post">
                    <?php wp_nonce_field('h2l_settings_nonce'); ?>
                    <input type="hidden" name="h2l_send_test_email" value="1">
                    <table class="form-table">
                        <tr>
                            <th scope="row"><label for="h2l_test_email">Alıcı E-posta</label></th>
                            <td>
                                <input name="h2l_test_email" type="email" id="h2l_test_email" value="<?php echo esc_attr(wp_get_current_user()->user_email); ?>" class="regular-text">
                                <input type="submit" class="button button-secondary" value="Test Gönder">
                            </td>
                        </tr>
                    </table>
                </form>
            </div>
        <?php endif; ?>
    </div>
    <?php
}
?>
<?php
/**
 * Hatırlatıcı ve Bildirim Motoru (Site İçi Bildirim Entegreli)
 */

class H2L_Reminder {

    private $table_tasks;

    public function __construct() {
        global $wpdb;
        $this->table_tasks = $wpdb->prefix . 'h2l_tasks';
    }

    /**
     * CRON: Kuyruğu İşle
     */
    public function process_queue() {
        global $wpdb;

        $now = current_time( 'mysql' );
        $target_time = date( 'Y-m-d H:i:s', strtotime( '+15 minutes', strtotime($now) ) );
        $one_day_ago = date( 'Y-m-d H:i:s', strtotime( '-24 hours', strtotime($now) ) );

        $tasks_to_remind = $wpdb->get_results( $wpdb->prepare( 
            "SELECT t.*, p.title as project_title 
            FROM {$this->table_tasks} t 
            LEFT JOIN {$wpdb->prefix}h2l_projects p ON t.project_id = p.id
            WHERE t.status NOT IN ('completed', 'cancelled', 'trash') 
            AND t.reminder_enabled = 1 
            AND t.reminder_sent = 0 
            AND t.due_date <= %s 
            AND t.due_date > %s
            LIMIT 20", 
            $target_time, 
            $one_day_ago 
        ) );

        if ( empty( $tasks_to_remind ) ) return;

        foreach ( $tasks_to_remind as $task ) {
            $this->send_task_notification( $task, 'reminder' );
            
            $wpdb->update( 
                $this->table_tasks, 
                array( 'reminder_sent' => 1 ), 
                array( 'id' => $task->id ),
                array( '%d' ),
                array( '%d' )
            );
        }
    }

    /**
     * ANLIK: Görev Atama
     */
    public function send_assignment_notification( $task_id, $assignee_ids ) {
        global $wpdb;
        
        $task = $wpdb->get_row( $wpdb->prepare(
            "SELECT t.*, p.title as project_title 
            FROM {$this->table_tasks} t 
            LEFT JOIN {$wpdb->prefix}h2l_projects p ON t.project_id = p.id
            WHERE t.id = %d", 
            $task_id 
        ));

        if ( ! $task || empty( $assignee_ids ) ) return;

        foreach ( $assignee_ids as $user_id ) {
            if ( $user_id == get_current_user_id() ) continue;

            $user = get_userdata( $user_id );
            if ( $user ) {
                $this->send_email_generic( $user, $task, 'assignment' );
                // Site İçi Bildirim
                if ( class_exists('H2L_Notification') ) {
                    H2L_Notification::create( 
                        $user_id, 
                        'assignment', 
                        'Yeni Görev Atandı', 
                        $task->title, 
                        '/gorevler/gorev/' . $task->id 
                    );
                }
            }
        }
    }

    /**
     * ANLIK: Proje Yöneticisi Daveti (YENİ)
     */
    public function send_project_invite_notification( $project_id, $manager_ids ) {
        global $wpdb;
        
        $project = $wpdb->get_row( $wpdb->prepare( "SELECT * FROM {$wpdb->prefix}h2l_projects WHERE id = %d", $project_id ) );
        if ( ! $project || empty( $manager_ids ) ) return;

        // Task yapısına uygun sahte bir obje oluşturuyoruz ki generic mail fonksiyonunu kullanabilelim
        $dummy_task = new stdClass();
        $dummy_task->id = 0; // Link proje linki olacak
        $dummy_task->title = 'Proje: ' . $project->title;
        $dummy_task->project_title = $project->title;
        $dummy_task->priority = 3; 
        $dummy_task->due_date = null;

        $project_link = '/gorevler/proje/' . $project->id;

        foreach ( $manager_ids as $user_id ) {
            if ( $user_id == get_current_user_id() ) continue;

            $user = get_userdata( $user_id );
            if ( $user ) {
                // Mail Gönder (Tip: project_invite)
                $this->send_email_generic( $user, $dummy_task, 'project_invite', '', $project_link );
                
                // Site İçi Bildirim
                if ( class_exists('H2L_Notification') ) {
                    H2L_Notification::create( 
                        $user_id, 
                        'project_invite', 
                        'Projeye Eklendiniz', 
                        $project->title . ' projesine yönetici olarak eklendiniz.', 
                        $project_link 
                    );
                }
            }
        }
    }

    /**
     * ANLIK: Mention
     */
    public function send_mention_notification( $task_id, $mentioned_user_ids, $comment_content ) {
        global $wpdb;

        $task = $wpdb->get_row( $wpdb->prepare(
            "SELECT t.*, p.title as project_title 
            FROM {$this->table_tasks} t 
            LEFT JOIN {$wpdb->prefix}h2l_projects p ON t.project_id = p.id
            WHERE t.id = %d", 
            $task_id 
        ));

        if ( ! $task ) return;

        foreach ( $mentioned_user_ids as $user_id ) {
            if ( $user_id == get_current_user_id() ) continue;

            $user = get_userdata( $user_id );
            if ( $user ) {
                $this->send_email_generic( $user, $task, 'mention', $comment_content );
                // Site İçi Bildirim
                if ( class_exists('H2L_Notification') ) {
                    H2L_Notification::create( 
                        $user_id, 
                        'mention', 
                        'Sizden Bahsedildi', 
                        $task->title, 
                        '/gorevler/gorev/' . $task->id 
                    );
                }
            }
        }
    }

    private function send_task_notification( $task, $type = 'reminder' ) {
        $assignees = !empty($task->assignee_ids) ? json_decode($task->assignee_ids) : [];
        if ( empty($assignees) ) return false;

        $sent_count = 0;
        foreach ( $assignees as $user_id ) {
            $user = get_userdata( $user_id );
            if ( ! $user ) continue;
            if ( $this->send_email_generic( $user, $task, $type ) ) {
                $sent_count++;
                // Site İçi Bildirim (Reminder)
                if ( class_exists('H2L_Notification') ) {
                    H2L_Notification::create( 
                        $user_id, 
                        'reminder', 
                        'Hatırlatma', 
                        $task->title, 
                        '/gorevler/gorev/' . $task->id 
                    );
                }
            }
        }
        return $sent_count > 0;
    }

    private function send_email_generic( $user, $task, $type, $extra_content = '', $custom_link = '' ) {
        $pref = get_user_meta($user->ID, 'h2l_pref_email_notifications', true);
        if ( $pref === '0' ) {
            return false;
        }

        $to = $user->user_email;
        $task_title = wp_strip_all_tags( $task->title );
        if ( mb_strlen($task_title) > 90 ) $task_title = mb_substr($task_title, 0, 90) . '...';
        
        $project_name = !empty($task->project_title) ? $task->project_title : 'Inbox';
        $action_link = $custom_link ? site_url($custom_link) : site_url('/gorevler/gorev/' . $task->id);
        
        $subject = '';
        $intro_text = '';
        $highlight_color = '#808080';

        switch ( $type ) {
            case 'assignment':
                $subject = "📋 Yeni Görev Atandı: {$task_title}";
                $intro_text = "Merhaba {$user->display_name},<br>Sana yeni bir görev atandı.";
                $highlight_color = '#246fe0';
                break;
            
            case 'mention':
                $subject = "💬 Bahsedildiniz: {$task_title}";
                $intro_text = "Merhaba {$user->display_name},<br>Bir yorumda senden bahsedildi:<br><br><em>\"" . wp_trim_words($extra_content, 20) . "\"</em>";
                $highlight_color = '#e67e22';
                break;

            case 'project_invite':
                $subject = "📁 Projeye Eklendiniz: {$project_name}";
                $intro_text = "Merhaba {$user->display_name},<br><strong>{$project_name}</strong> projesine yönetici olarak eklendiniz.";
                $highlight_color = '#8e44ad'; // Mor
                $task_title = "Proje: " . $project_name; // Kartta görünecek başlık
                break;

            case 'reminder':
            default:
                $subject = get_option('h2l_reminder_subject', "🔔 Hatırlatma: {$task_title}");
                $subject = str_replace('{task_title}', $task_title, $subject);
                $custom_body = get_option('h2l_reminder_body', "Merhaba {user_name},\n\nAşağıdaki görevin zamanı geldi:");
                $intro_text = nl2br(str_replace('{user_name}', $user->display_name, $custom_body));
                $highlight_color = '#d1453b';
                break;
        }

        $priority_colors = [ 1 => '#d1453b', 2 => '#eb8909', 3 => '#246fe0', 4 => '#808080' ];
        if(isset($task->priority) && isset($priority_colors[$task->priority])) {
            $highlight_color = $priority_colors[$task->priority];
        }

        $footer_text = get_option('h2l_reminder_footer', 'Bu e-posta Adbreak CRM Görev Yöneticisi tarafından gönderilmiştir.');
        $due_date_display = $task->due_date ? date_i18n( 'j F Y, H:i', strtotime( $task->due_date ) ) : 'Belirtilmedi';

        $message = '
        <!DOCTYPE html>
        <html>
        <head>
            <meta charset="UTF-8">
            <style>
                body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif; background-color: #f9f9f9; color: #333; margin: 0; padding: 0; }
                .container { max-width: 600px; margin: 20px auto; background: #fff; border-radius: 8px; overflow: hidden; box-shadow: 0 2px 10px rgba(0,0,0,0.05); border: 1px solid #eee; }
                .header { background: #fff; padding: 20px 30px; border-bottom: 1px solid #f0f0f0; }
                .content { padding: 30px; }
                .task-card { background: #fafafa; padding: 20px; border-left: 5px solid '.$highlight_color.'; border-radius: 4px; margin: 20px 0; }
                .task-title { margin: 0 0 10px 0; font-size: 18px; color: #202020; }
                .meta { font-size: 13px; color: #777; }
                .btn { display: inline-block; padding: 12px 24px; background: '.$highlight_color.'; color: #fff !important; text-decoration: none; border-radius: 6px; font-weight: bold; font-size: 14px; }
                .footer { background: #fcfcfc; padding: 20px; text-align: center; font-size: 12px; color: #aaa; border-top: 1px solid #f0f0f0; }
            </style>
        </head>
        <body>
            <div class="container">
                <div class="header">
                    <h2 style="margin:0; font-size:20px; color:#333;">Adbreak Görevler</h2>
                </div>
                <div class="content">
                    <p style="font-size:15px; line-height:1.6;">' . $intro_text . '</p>
                    
                    <div class="task-card">
                        <h3 class="task-title">' . $task_title . '</h3>
                        <div class="meta">
                            📁 <strong>' . esc_html($project_name) . '</strong> &nbsp;|&nbsp; 📅 ' . $due_date_display . '
                        </div>
                    </div>

                    <div style="text-align: center; margin-top: 30px;">
                        <a href="' . esc_url($action_link) . '" class="btn">Görüntüle</a>
                    </div>
                </div>
                <div class="footer">' . nl2br(esc_html($footer_text)) . '</div>
            </div>
        </body>
        </html>';

        $headers = array('Content-Type: text/html; charset=UTF-8');
        
        if(wp_mail( $to, $subject, $message, $headers )) {
            return true;
        }
        return false;
    }

    public function send_test_reminder( $to_email ) {
        $user = new stdClass();
        $user->user_email = $to_email;
        $user->display_name = 'Test Kullanıcısı';
        $user->ID = get_current_user_id();

        $task = new stdClass();
        $task->id = 0;
        $task->title = 'Bu bir test görevidir';
        $task->project_title = 'Test Projesi';
        $task->priority = 2;
        $task->due_date = current_time('mysql');
        
        return $this->send_email_generic( $user, $task, 'reminder' );
    }
}
?>
<?php
/**
 * Hatırlatıcı ve Bildirim Motoru
 * - 15 Dakika Önceden Hatırlatma
 * - Parçalı Şablon Yapısı (Intro + Sabit Kart + Footer)
 * - Subject truncation (90 char)
 * - Test gönderimi
 */

class H2L_Reminder {

    private $table_tasks;

    public function __construct() {
        global $wpdb;
        $this->table_tasks = $wpdb->prefix . 'h2l_tasks';
    }

    /**
     * Kuyruğu İşle
     */
    public function process_queue() {
        global $wpdb;

        $now = current_time( 'mysql' );
        $target_time = date( 'Y-m-d H:i:s', strtotime( '+15 minutes', strtotime($now) ) );
        $one_day_ago = date( 'Y-m-d H:i:s', strtotime( '-24 hours', strtotime($now) ) );

        error_log("H2L Reminder Çalıştı. Hedef Zaman (Now+15m): " . $target_time);

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

        if ( empty( $tasks_to_remind ) ) {
            return;
        }

        error_log("H2L Reminder: " . count($tasks_to_remind) . " adet görev bulundu.");

        foreach ( $tasks_to_remind as $task ) {
            $result = $this->send_notification( $task );
            
            if ( $result ) {
                $wpdb->update( 
                    $this->table_tasks, 
                    array( 'reminder_sent' => 1 ), 
                    array( 'id' => $task->id ),
                    array( '%d' ),
                    array( '%d' )
                );
                error_log("H2L Reminder: Görev ID {$task->id} ({$task->title}) için mail gönderildi ve işaretlendi.");
            } else {
                error_log("H2L Reminder: Görev ID {$task->id} için e-posta gönderilemedi.");
            }
        }
    }

    /**
     * E-posta Bildirimi Gönder
     */
    private function send_notification( $task ) {
        $assignees = !empty($task->assignee_ids) ? json_decode($task->assignee_ids) : [];
        
        if ( empty($assignees) ) {
            return false;
        }

        $sent_count = 0;

        foreach ( $assignees as $user_id ) {
            $user = get_userdata( $user_id );
            if ( ! $user ) continue;

            if ( $this->send_email_to_user( $user, $task ) ) {
                $sent_count++;
            }
        }

        return $sent_count > 0;
    }

    /**
     * TEST: Test Maili Gönder
     */
    public function send_test_reminder( $to_email ) {
        $user = new stdClass();
        $user->user_email = $to_email;
        $user->display_name = 'Test Kullanıcısı';
        $user->ID = get_current_user_id();

        $task = new stdClass();
        $task->id = 999999;
        $task->title = 'Bu bir test görevidir ve başlığı oldukça uzundur ki sistemin doksan karakter sınırını aşıp aşmadığını kontrol edebilelim.';
        $task->project_title = 'Test Projesi';
        $task->priority = 1;
        $task->due_date = current_time('mysql');
        
        return $this->send_email_to_user( $user, $task );
    }

    /**
     * HTML E-posta Şablonu (Şık Tasarım + Modüler)
     */
    private function send_email_to_user( $user, $task ) {
        $to = $user->user_email;
        
        // Görev Verileri
        $title_raw = isset($task->title) ? (string)$task->title : '';
        $title_stripped = wp_strip_all_tags($title_raw);
        
        // Başlık Kısaltma (90 Karakter)
        if ( mb_strlen($title_stripped) > 90 ) {
            $title_stripped = mb_substr($title_stripped, 0, 90) . '...';
        }

        $task_link = site_url('/gorevler/gorev/' . $task->id);
        $project_name = !empty($task->project_title) ? (string)$task->project_title : 'Inbox';
        $due_date_formatted = date_i18n( get_option( 'date_format' ) . ' ' . get_option( 'time_format' ), strtotime( $task->due_date ) );

        // Renkler
        $priority_colors = [ 1 => '#d1453b', 2 => '#eb8909', 3 => '#246fe0', 4 => '#808080' ];
        $p_color = isset($priority_colors[$task->priority]) ? $priority_colors[$task->priority] : '#808080';

        // Ayarlardan Şablonları Çek
        $subject_tpl = get_option('h2l_reminder_subject', '🔔 Hatırlatma: {task_title}');
        $intro_tpl = get_option('h2l_reminder_body', "Merhaba {user_name},\n\nAşağıdaki görevin zamanı geldi:");
        $footer_tpl = get_option('h2l_reminder_footer', 'Bu e-posta Hip to List Görev Yöneticisi tarafından gönderilmiştir.');

        // Konu
        $subject = str_replace(
            ['{task_title}', '{project_name}', '{user_name}', '{due_date}'],
            [$title_stripped, $project_name, $user->display_name, $due_date_formatted],
            $subject_tpl
        );

        // 1. GİRİŞ METNİ (Intro)
        // wpautop ile satır başlarını <p> tagine çevirelim ki düzgün görünsün
        $intro_html = wpautop( str_replace(
            ['{user_name}'],
            [$user->display_name],
            $intro_tpl
        ));

        // 2. SABİT GÖREV KARTI (Fixed Card)
        $card_html = '
        <div class="task-card" style="border-left-color: ' . $p_color . ';">
            <h3 style="margin: 0 0 8px 0; font-size: 16px; color: #333;">' . wp_kses_post($title_raw) . '</h3>
            <p style="margin: 0; font-size: 13px; color: #777; line-height: 1.5;">
                📁 <strong>' . esc_html($project_name) . '</strong> &nbsp;|&nbsp; 📅 ' . $due_date_formatted . '
            </p>
        </div>

        <div style="text-align: center; margin-top: 25px; margin-bottom: 25px;">
            <a href="' . esc_url($task_link) . '" class="btn">Görevi Görüntüle</a>
        </div>';

        // 3. FOOTER
        $footer_html = wpautop( $footer_tpl );

        // --- TAM HTML İSKELETİ (CSS Dahil) ---
        $message = '
        <!DOCTYPE html>
        <html>
        <head>
            <meta charset="UTF-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <style>
                body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif; line-height: 1.6; color: #333; background-color: #f9f9f9; margin: 0; padding: 0; }
                .wrapper { width: 100%; background-color: #f9f9f9; padding: 40px 0; }
                .container { max-width: 600px; margin: 0 auto; padding: 30px; border: 1px solid #eee; border-radius: 12px; background-color: #ffffff; box-shadow: 0 4px 20px rgba(0,0,0,0.05); }
                .header { border-bottom: 1px solid #f0f0f0; padding-bottom: 15px; margin-bottom: 25px; }
                .task-card { background: #fafafa; padding: 20px; border-left: 5px solid #808080; border-radius: 6px; margin-bottom: 20px; box-shadow: 0 2px 5px rgba(0,0,0,0.02); }
                .btn { display: inline-block; padding: 12px 24px; background-color: #db4c3f; color: #ffffff !important; text-decoration: none; border-radius: 6px; font-weight: 600; font-size: 14px; transition: background-color 0.2s; }
                .btn:hover { background-color: #c53727; }
                .footer { margin-top: 30px; padding-top: 20px; border-top: 1px solid #f9f9f9; font-size: 12px; color: #aaa; text-align: center; }
                .footer p { margin: 5px 0; }
                a { color: #db4c3f; text-decoration: none; }
            </style>
        </head>
        <body>
            <div class="wrapper">
                <div class="container">
                    <div class="header">
                        <h2 style="margin:0; color:#202020; font-size: 20px;">Hatırlatma</h2>
                    </div>
                    
                    <div class="content">
                        ' . $intro_html . '
                    </div>
                    
                    ' . $card_html . '
                    
                    <div class="footer">
                        ' . $footer_html . '
                    </div>
                </div>
            </div>
        </body>
        </html>
        ';

        $headers = array('Content-Type: text/html; charset=UTF-8');
        
        $mail_result = wp_mail( $to, $subject, $message, $headers );

        if ($mail_result) {
            if ( class_exists('H2L_Activity') && isset($task->id) && $task->id != 999999 ) {
                H2L_Activity::log('task', $task->id, 'reminder_sent', ['via' => 'email', 'to' => $user->ID]);
            }
            return true;
        } else {
            error_log("H2L Reminder: Mail gönderimi BAŞARISIZ -> " . $to);
            return false;
        }
    }
}
?>
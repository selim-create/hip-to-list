<?php
/**
 * Hatırlatıcı ve Bildirim İşlemleri
 */

class H2L_Reminder {

    /**
     * Görev için hatırlatıcı zamanla
     * (Basit MVP: Görev due_date'ine göre kontrol edilir, ayrı tablo kullanılmaz)
     */
    public function schedule_reminder( $task_id, $due_date ) {
        // V2.0'da buraya Action Scheduler entegrasyonu gelecek.
        // Şimdilik logic process_queue içinde dönüyor.
        return true;
    }

    /**
     * Bekleyen hatırlatmaları işle (Cron tarafından çağrılır)
     */
    public function process_queue() {
        global $wpdb;
        $table_tasks = $wpdb->prefix . 'h2l_tasks';

        // Zamanı gelmiş (son 1 saat içinde) ve henüz tamamlanmamış, hatırlatması açık görevleri bul
        // Not: Bu sorgu örnektir, gerçek senaryoda 'reminder_sent' meta alanı kontrol edilmeli.
        $now = current_time( 'mysql' );
        $one_hour_ago = date( 'Y-m-d H:i:s', strtotime( '-1 hour' ) );

        $tasks_to_remind = $wpdb->get_results( $wpdb->prepare( 
            "SELECT * FROM $table_tasks 
            WHERE status = 'open' 
            AND due_date <= %s 
            AND due_date > %s", 
            $now, $one_hour_ago 
        ) );

        foreach ( $tasks_to_remind as $task ) {
            $this->send_notification( $task );
        }
    }

    /**
     * Bildirim Gönder (WP Admin Bar veya Email)
     */
    private function send_notification( $task ) {
        $user_id = $task->assignee_id;
        $user = get_userdata( $user_id );

        if ( ! $user ) return;

        // E-posta gönderimi
        $to = $user->user_email;
        $subject = 'Hatırlatma: ' . $task->title;
        $message = sprintf( 
            "Merhaba %s,\n\n'%s' görevinin zamanı geldi.\n\nDetaylar için panele giriş yapınız.", 
            $user->display_name, 
            $task->title 
        );

        wp_mail( $to, $subject, $message );

        // İleride buraya 'h2l_activity_log' kaydı eklenecek.
    }
}
?>
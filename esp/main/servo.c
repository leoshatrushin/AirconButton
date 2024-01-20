#include "driver/ledc.h"

#define SERVO_GPIO_PIN 22
#define LEDC_MODE LEDC_LOW_SPEED_MODE
#define LEDC_RESOLUTION LEDC_TIMER_16_BIT
#define LEDC_TIMER LEDC_TIMER_0
#define LEDC_CHANNEL LEDC_CHANNEL_0

void initialize_servo() {
    // Prepare and then apply the LEDC PWM timer configuration
    ledc_timer_config_t ledc_timer = {
        .speed_mode = LEDC_MODE,
        .duty_resolution = LEDC_RESOLUTION,
        .timer_num = LEDC_TIMER,
        .freq_hz = 50, // Servo motors typically use a frequency of 50 Hz
        .clk_cfg = LEDC_AUTO_CLK,
    };
    ESP_ERROR_CHECK(ledc_timer_config(&ledc_timer));

    // Prepare and then apply the LEDC PWM channel configuration
    ledc_channel_config_t ledc_channel = {
        .speed_mode = LEDC_MODE,
        .channel    = LEDC_CHANNEL,
        .timer_sel  = LEDC_TIMER,
        .intr_type  = LEDC_INTR_DISABLE,
        .gpio_num   = SERVO_GPIO_PIN,
        .duty       = 0, // Set duty to 0%
        .hpoint     = 0,
    };
    ESP_ERROR_CHECK(ledc_channel_config(&ledc_channel));
}

void rotate_servo(int degrees) {
    // constants for the pulse widths corresponding to 0 and 180 degrees
    const int min_pulse_width = 500; // in microseconds
    const int max_pulse_width = 2500; // in microseconds

    // linearly map the angle to the pulse width
    int pulse_width = min_pulse_width + (max_pulse_width - min_pulse_width) * degrees / 180;

    // convert pulse width to duty cycle
    // assuming a frequency of 50 Hz, the total period is 20000 microseconds
    int total_period = 20000; // in microseconds
    int duty_cycle = (pulse_width * (1 << LEDC_RESOLUTION)) / total_period;

    // rotate servo
    ledc_set_duty(LEDC_MODE, LEDC_CHANNEL, duty_cycle);
    ledc_update_duty(LEDC_MODE, LEDC_CHANNEL);
}

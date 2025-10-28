/**
 * WindHistoryDisplay - displays today's wind history as a smooth gradient bar (6:00-20:00)
 * Uses 5-minute intervals for smooth visualization
 */
class WindHistoryDisplay {
    constructor() {
        this.historyContainer = null;
        this.apiBaseUrl = '/api';
    }

    init() {
        this.historyContainer = document.getElementById('windHistory');
        if (!this.historyContainer) {
            console.error('Wind history container not found');
            return false;
        }
        return true;
    }

    showLoading() {
        if (this.historyContainer) {
            this.historyContainer.innerHTML = `
                <div class="text-center py-8">
                    <div class="inline-block w-5 h-5 border-3 border-white/30 border-t-white rounded-full animate-spin mb-3"></div>
                    <p class="text-white/80">Загружаем историю ветра...</p>
                </div>
            `;
        }
    }

    showError(error) {
        if (this.historyContainer) {
            this.historyContainer.innerHTML = `
                <div class="text-center py-6">
                    <p class="text-red-400">Ошибка загрузки истории: ${error.message || 'Неизвестная ошибка'}</p>
                </div>
            `;
        }
    }

    getWindColor(speed) {
        const knots = parseFloat(speed) || 0;
        if (knots < 5) return '#87CEEB';      // Голубой - слабый
        if (knots < 10) return '#00CED1';     // Бирюзовый
        if (knots < 15) return '#00FF00';     // Зелёный - отлично
        if (knots < 20) return '#FFD700';     // Жёлтый - хорошо
        if (knots < 25) return '#FFA500';     // Оранжевый
        if (knots < 30) return '#FF4500';     // Красно-оранжевый
        return '#8B0000';                      // Тёмно-красный - опасно
    }

    /**
     * Fetch today's wind history from backend API
     * Requests data in 5-minute intervals for smooth gradient
     */
    async fetchTodayHistory() {
        try {
            const response = await fetch(`${this.apiBaseUrl}/wind/today/gradient?start=6&end=19&interval=5`);
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            return await response.json();
        } catch (error) {
            console.error('Error fetching wind history:', error);
            throw error;
        }
    }

    /**
     * Display wind history as gradient bar
     */
    async displayHistory() {
        try {
            this.showLoading();
            const hourlyData = await this.fetchTodayHistory();

            if (!hourlyData || hourlyData.length === 0) {
                this.historyContainer.innerHTML = `
                    <div class="text-center py-6">
                        <p class="text-white/70">Данные о ветре за сегодня пока отсутствуют</p>
                        <p class="text-white/50 text-sm mt-2">Сбор данных начинается с 6:00</p>
                    </div>
                `;
                return;
            }

            let historyHTML = `
                <div style="position: relative;">
                    <!-- Плавная градиентная полоса истории ветра -->
                    <div style="display: flex; height: 60px; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 15px rgba(0,0,0,0.3);">
            `;

            // Создаем плавный градиент с 5-минутными сегментами (6:00-19:00)
            // Всего 13 часов * 12 сегментов по 5 минут = 156 сегментов
            const startHour = 6;
            const endHour = 19;
            const totalMinutes = (endHour - startHour) * 60;
            const segmentMinutes = 5;
            const totalSegments = totalMinutes / segmentMinutes;

            for (let i = 0; i < totalSegments; i++) {
                const minutesFromStart = i * segmentMinutes;
                const currentHour = startHour + Math.floor(minutesFromStart / 60);
                const currentMinute = minutesFromStart % 60;

                // Ищем данные для текущего 5-минутного интервала
                const segmentData = hourlyData.find(d => {
                    const dataHour = parseInt(d.hour);
                    const dataMinute = parseInt(d.minute || 0);
                    return dataHour === currentHour && Math.abs(dataMinute - currentMinute) < 5;
                });

                if (segmentData && segmentData.measurements > 0) {
                    const avgSpeed = parseFloat(segmentData.avg_speed);
                    const maxGust = parseFloat(segmentData.max_gust) || avgSpeed;
                    const color = this.getWindColor(avgSpeed);
                    const timeLabel = `${currentHour}:${currentMinute.toString().padStart(2, '0')}`;

                    historyHTML += `
                        <div style="flex: 1; background: ${color}; position: relative;"
                             title="${timeLabel} - Средний: ${avgSpeed.toFixed(1)} узлов, Макс: ${maxGust.toFixed(1)} узлов">
                        </div>
                    `;
                } else {
                    // Пустой сегмент для интервалов без данных
                    historyHTML += `
                        <div style="flex: 1; background: rgba(255,255,255,0.05); position: relative;">
                        </div>
                    `;
                }
            }

            historyHTML += `
                    </div>

                    <!-- Часовые метки -->
                    <div style="display: flex; justify-content: space-between; margin-top: 10px; font-size: 0.75rem; color: rgba(255,255,255,0.7);">
            `;

            // Добавляем метки для ключевых часов (6, 10, 13, 16, 19)
            for (let hour = 6; hour <= 19; hour++) {
                const shouldShowLabel = hour === 6 || hour === 10 || hour === 13 || hour === 16 || hour === 19;
                if (shouldShowLabel) {
                    // Рассчитываем позицию метки как процент от общей длины
                    const position = ((hour - 6) / (19 - 6)) * 100;
                    historyHTML += `
                        <div style="position: absolute; left: ${position}%; transform: translateX(-50%);">
                            <span style="font-weight: 600; color: rgba(255,255,255,0.9);">${hour}:00</span>
                        </div>
                    `;
                }
            }

            historyHTML += `
                    </div>
                    <div style="height: 20px;"></div> <!-- Spacer for labels -->

                    <!-- Легенда -->
                    <div style="display: flex; justify-content: center; gap: 15px; margin-top: 15px; font-size: 0.7rem; color: rgba(255,255,255,0.8); flex-wrap: wrap;">
                        <div style="display: flex; align-items: center; gap: 5px;">
                            <div style="width: 12px; height: 12px; background: #87CEEB; border-radius: 2px;"></div>
                            <span>&lt;5 узлов</span>
                        </div>
                        <div style="display: flex; align-items: center; gap: 5px;">
                            <div style="width: 12px; height: 12px; background: #00FF00; border-radius: 2px;"></div>
                            <span>10-15 узлов</span>
                        </div>
                        <div style="display: flex; align-items: center; gap: 5px;">
                            <div style="width: 12px; height: 12px; background: #FFD700; border-radius: 2px;"></div>
                            <span>15-20 узлов</span>
                        </div>
                        <div style="display: flex; align-items: center; gap: 5px;">
                            <div style="width: 12px; height: 12px; background: #FF4500; border-radius: 2px;"></div>
                            <span>25-30 узлов</span>
                        </div>
                    </div>
                </div>
            `;

            this.historyContainer.innerHTML = historyHTML;

        } catch (error) {
            console.error('Error displaying wind history:', error);
            this.showError(error);
        }
    }

    clear() {
        if (this.historyContainer) {
            this.historyContainer.innerHTML = '';
        }
    }
}

export default WindHistoryDisplay;

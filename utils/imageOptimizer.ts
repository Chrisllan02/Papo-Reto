
/**
 * Gera uma URL otimizada para imagens externas usando o serviço wsrv.nl.
 * Isso permite redimensionamento on-the-fly, conversão para WebP e cache CDN.
 * 
 * @param url URL original da imagem (Câmara, Senado, Wikipedia, etc)
 * @param width Largura desejada em pixels (controla o tamanho do arquivo baixado)
 * @returns URL otimizada ou a original se for local/data-uri
 */
export const getOptimizedImageUrl = (url: string, width: number = 200) => {
    if (!url) return '';
    
    // Não otimiza imagens locais (assets) ou Base64
    if (url.startsWith('data:') || url.startsWith('/') || url.includes('localhost') || url.includes('127.0.0.1')) {
        return url;
    }

    try {
        // Remove protocolo para evitar problemas com URLs mistas, o wsrv lida bem com isso
        const cleanUrl = url.replace(/^https?:\/\//, '');
        
        // Parâmetros:
        // url: url original codificada
        // w: largura
        // q: qualidade (80 é um bom equilíbrio)
        // output: webp (menor tamanho, alta qualidade)
        // il: interlace/progressive load
        return `https://wsrv.nl/?url=${encodeURIComponent(cleanUrl)}&w=${width}&q=80&output=webp&il`;
    } catch (e) {
        return url;
    }
};

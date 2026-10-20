import { ImageResponse } from 'next/og';

export const size = {
  width: 192,
  height: 192,
};
export const contentType = 'image/png';

export default function Icon() {
  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          background: '#FFFFFF',
          borderRadius: '32px',
          border: '6px solid #0B1E2D',
        }}
      >
        <div
          style={{
            display: 'flex',
            fontSize: 56,
            fontWeight: 900,
            color: '#E10A23',
            lineHeight: 1,
            letterSpacing: '-2px',
          }}
        >
          TRY
        </div>
        <div
          style={{
            display: 'flex',
            fontSize: 38,
            fontWeight: 900,
            color: '#0B1E2D',
            lineHeight: 1,
            marginTop: 4,
            letterSpacing: '-1px',
          }}
        >
          AGAIN
        </div>
        <div
          style={{
            width: '75%',
            height: 6,
            background: '#E10A23',
            marginTop: 10,
            borderRadius: 3,
          }}
        />
      </div>
    ),
    { ...size }
  );
}
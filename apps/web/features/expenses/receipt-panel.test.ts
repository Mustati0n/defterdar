import { canAddReceipt, uploadToPresigned } from './receipt-panel';

class FakeXhr {
  static status = 200;
  status = FakeXhr.status;
  upload: {
    onprogress?: (event: {
      lengthComputable: boolean;
      loaded: number;
      total: number;
    }) => void;
  } = {};
  onload?: () => void;
  onerror?: () => void;
  open = jest.fn();
  setRequestHeader = jest.fn();
  send = jest.fn(() => {
    this.upload.onprogress?.({ lengthComputable: true, loaded: 5, total: 10 });
    this.onload?.();
  });
}

describe('receipt upload behavior', () => {
  beforeEach(() => {
    Object.defineProperty(global, 'XMLHttpRequest', {
      value: FakeXhr,
      configurable: true,
    });
  });

  it('blocks the sixth active receipt', () => {
    expect(canAddReceipt(4)).toBe(true);
    expect(canAddReceipt(5)).toBe(false);
  });

  it('reports upload progress and completes a successful PUT', async () => {
    FakeXhr.status = 200;
    const progress = jest.fn();
    await expect(
      uploadToPresigned(
        'https://storage.test/upload',
        new File(['x'], 'fis.pdf', { type: 'application/pdf' }),
        progress,
      ),
    ).resolves.toBeUndefined();
    expect(progress).toHaveBeenCalledWith(50);
  });

  it('keeps a failure signal when the storage PUT fails', async () => {
    FakeXhr.status = 500;
    await expect(
      uploadToPresigned(
        'https://storage.test/upload',
        new File(['x'], 'fis.pdf'),
        jest.fn(),
      ),
    ).rejects.toThrow('Upload failed');
  });
});
